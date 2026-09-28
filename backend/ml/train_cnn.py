import os
import torch
import torch.nn as nn
from torchvision import models, transforms
from torch.utils.data import Dataset, DataLoader
from PIL import Image
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import copy
from pathlib import Path

# Paths
DATA_DIR = r"c:\Users\saran\Desktop\sih\Mastitis cnn detection"
ARTIFACTS_DIR = r"c:\Users\saran\Desktop\sih\backend\ml\artifacts"
Path(ARTIFACTS_DIR).mkdir(parents=True, exist_ok=True)

class MastitisDataset(Dataset):
    def __init__(self, image_paths, labels, transform=None):
        self.image_paths = image_paths
        self.labels = labels
        self.transform = transform
        
    def __len__(self):
        return len(self.image_paths)
        
    def __getitem__(self, idx):
        path = self.image_paths[idx]
        label = self.labels[idx]
        
        try:
            image = Image.open(path).convert('RGB')
        except Exception as e:
            image = Image.new('RGB', (224, 224))
            
        if self.transform:
            image = self.transform(image)
            
        return image, label

def get_valid_images():
    classes = ['Normal', 'Mastitis']
    valid_paths = []
    labels = []
    
    for label, cls in enumerate(classes):
        cls_dir = os.path.join(DATA_DIR, cls)
        if not os.path.isdir(cls_dir):
            print(f"Warning: {cls_dir} not found")
            continue
            
        for fname in os.listdir(cls_dir):
            if fname.lower().endswith(('.jpg', '.jpeg', '.png')):
                path = os.path.join(cls_dir, fname)
                try:
                    img = Image.open(path)
                    img.verify()
                    valid_paths.append(path)
                    labels.append(label)
                except Exception as e:
                    print(f"Skipping bad image: {path} - {e}")
                    
    return valid_paths, labels

def main():
    print("Loading image paths...")
    image_paths, labels = get_valid_images()
    print(f"Found {len(image_paths)} valid images.")
    
    if len(image_paths) == 0:
        print("No valid images found. Exiting.")
        return

    X_train, X_temp, y_train, y_temp = train_test_split(image_paths, labels, test_size=0.3, stratify=labels, random_state=42)
    X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.5, stratify=y_temp, random_state=42)
    
    print(f"Train: {len(X_train)}, Val: {len(X_val)}, Test: {len(X_test)}")
    
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    val_test_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    train_dataset = MastitisDataset(X_train, y_train, train_transform)
    val_dataset = MastitisDataset(X_val, y_val, val_test_transform)
    test_dataset = MastitisDataset(X_test, y_test, val_test_transform)
    
    train_loader = DataLoader(train_dataset, batch_size=16, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=16, shuffle=False)
    test_loader = DataLoader(test_dataset, batch_size=16, shuffle=False)
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    
    print("Loading MobileNetV2...")
    model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.IMAGENET1K_V1)
    
    # PROPER FINE-TUNING: Don't freeze everything! 
    # Unfreeze the last few blocks (features.14 to features.18) for better accuracy.
    for name, param in model.named_parameters():
        if "features.14" in name or "features.15" in name or "features.16" in name or "features.17" in name or "features.18" in name or "classifier" in name:
            param.requires_grad = True
        else:
            param.requires_grad = False
            
    model.classifier = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(1280, 512),
        nn.ReLU(),
        nn.Dropout(0.2),
        nn.Linear(512, 2)
    )
    
    model = model.to(device)
    
    criterion = nn.CrossEntropyLoss()
    # Different learning rates: smaller for fine-tuned base, standard for new classifier head
    optimizer = torch.optim.Adam([
        {'params': [p for n, p in model.named_parameters() if 'features' in n and p.requires_grad], 'lr': 1e-4},
        {'params': model.classifier.parameters(), 'lr': 1e-3}
    ])
    
    # Scheduler to reduce LR when validation accuracy plateaus
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='max', factor=0.5, patience=3, verbose=True)
    
    epochs = 20 # slightly more epochs for fine-tuning
    best_val_acc = 0.0
    best_model_wts = copy.deepcopy(model.state_dict())
    
    print("Starting training...")
    for epoch in range(epochs):
        model.train()
        running_loss = 0.0
        
        for inputs, targets in train_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            optimizer.zero_grad()
            
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * inputs.size(0)
            
        epoch_train_loss = running_loss / len(train_dataset)
        
        model.eval()
        val_loss = 0.0
        correct = 0
        
        with torch.no_grad():
            for inputs, targets in val_loader:
                inputs, targets = inputs.to(device), targets.to(device)
                outputs = model(inputs)
                loss = criterion(outputs, targets)
                val_loss += loss.item() * inputs.size(0)
                
                _, preds = torch.max(outputs, 1)
                correct += torch.sum(preds == targets.data)
                
        epoch_val_loss = val_loss / len(val_dataset)
        epoch_val_acc = correct.double() / len(val_dataset)
        
        print(f"Epoch {epoch+1}/{epochs} | Train Loss: {epoch_train_loss:.4f} | Val Loss: {epoch_val_loss:.4f} | Val Acc: {epoch_val_acc:.4f}")
        
        scheduler.step(epoch_val_acc)
        
        if epoch_val_acc > best_val_acc:
            best_val_acc = epoch_val_acc
            best_model_wts = copy.deepcopy(model.state_dict())
            
    print(f"Best Val Acc: {best_val_acc:.4f}")
    model.load_state_dict(best_model_wts)
    
    print("Evaluating on test set...")
    model.eval()
    all_preds = []
    all_targets = []
    
    with torch.no_grad():
        for inputs, targets in test_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            outputs = model(inputs)
            _, preds = torch.max(outputs, 1)
            all_preds.extend(preds.cpu().numpy())
            all_targets.extend(targets.cpu().numpy())
            
    print("Test Accuracy:")
    test_acc = np.mean(np.array(all_preds) == np.array(all_targets))
    print(f"{test_acc:.4f}")
    print("Classification Report:")
    print(classification_report(all_targets, all_preds, target_names=['Normal', 'Mastitis']))
    print("Confusion Matrix:")
    print(confusion_matrix(all_targets, all_preds))
    
    save_path = os.path.join(ARTIFACTS_DIR, "cnn_model.pt")
    torch.save({
        'model_state_dict': model.state_dict(),
        'class_names': ['Normal', 'Mastitis'],
        'input_size': 224,
    }, save_path)
    print(f"Model saved to {save_path}")

if __name__ == "__main__":
    main()

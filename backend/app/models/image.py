import io
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
from pathlib import Path

from app.core.config import settings
from app.core.schemas import ImagePrediction


def load_cnn_model():
    """Load the trained CNN model."""
    model_path = Path(settings.ML_ARTIFACTS_DIR) / "cnn_model.pt"
    checkpoint = torch.load(str(model_path), map_location="cpu", weights_only=False)

    model = models.mobilenet_v2(weights=None)
    model.classifier = nn.Sequential(
        nn.Dropout(0.2),
        nn.Linear(1280, 2),
    )
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    return {
        "model": model,
        "class_names": checkpoint["class_names"],
        "transform": transforms.Compose(
            [
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225],
                ),
            ]
        ),
    }


def predict_cnn(model_data: dict, image_bytes: bytes) -> ImagePrediction:
    """Run CNN prediction on an uploaded image."""
    model = model_data["model"]
    transform = model_data["transform"]
    class_names = model_data["class_names"]

    # Load and transform image
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    tensor = transform(image).unsqueeze(0)  # Add batch dimension

    # Inference
    with torch.no_grad():
        outputs = model(tensor)
        probabilities = torch.softmax(outputs, dim=1)[0]

    # class_names = ['Normal', 'Mastitis']
    mastitis_prob = float(probabilities[1])  # probability of Mastitis class
    normal_prob = float(probabilities[0])

    detected = mastitis_prob > 0.5
    confidence = mastitis_prob if detected else normal_prob

    # cnn_score: always the probability toward mastitis (for joint score)
    cnn_score = mastitis_prob

    return ImagePrediction(
        detected=detected,
        confidence=round(confidence, 4),
        cnn_score=round(cnn_score, 4),
    )

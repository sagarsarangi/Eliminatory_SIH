import pandas as pd
import numpy as np
import joblib
import json
from pathlib import Path
from sklearn.model_selection import GroupShuffleSplit, GridSearchCV, StratifiedKFold
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score

def main():
    dataset_path = r"c:\Users\saran\Desktop\sih\Mastitis daatset and eda\cow_milk_mastitis_dataset.csv"
    print(f"Loading dataset from {dataset_path}")
    df = pd.read_csv(dataset_path)

    print("Data Preview:")
    print(df.head())
    print("\nMissing values:")
    print(df.isnull().sum())
    
    # Fill or drop nulls
    df.dropna(inplace=True)

    # Feature Engineering
    df['EC_pH_ratio'] = df['Milk_Conductivity'] / df['Milk_pH']
    df['SCC_log'] = np.log1p(df['Somatic_Cell_Count'])

    # Ensure Clotting is numeric
    if df['Clotting'].dtype == 'object':
        mapping = {'none': 0, 'slight': 1, 'clots': 2}
        df['Clotting'] = df['Clotting'].str.lower().map(mapping).fillna(0)

    # Features and Target
    # Proper evaluation: Somatic_Cell_Count (SCC) is a direct lab indicator of Mastitis (Data Leakage). 
    # To properly predict using IoT sensors (EC, pH, Temp), we exclude SCC.
    feature_cols = [
        'Milk_Temperature', 'Milk_pH', 'Milk_Conductivity',
        'Milk_Yield', 'Clotting', 'EC_pH_ratio'
    ]
    target_col = 'class1'

    X = df[feature_cols]
    y = df[target_col]
    groups = df['Cow_ID']

    print("\nFeatures:")
    for col in feature_cols:
        print(f"{col}: {df[col].unique()[:5]}")
    
    # Split by Cow_ID
    gss = GroupShuffleSplit(n_splits=1, train_size=0.8, random_state=42)
    train_idx, test_idx = next(gss.split(X, y, groups))

    X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
    y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]

    print(f"\nTrain size: {len(X_train)}, Test size: {len(X_test)}")
    
    # Train Random Forest
    rf = RandomForestClassifier(class_weight='balanced', random_state=42)
    
    param_grid = {
        'n_estimators': [100, 200, 300],
        'max_depth': [5, 10, 15, None],
        'min_samples_leaf': [2, 5, 10]
    }
    
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    grid_search = GridSearchCV(rf, param_grid, cv=cv, scoring='f1_macro', n_jobs=-1)
    
    print("\nTraining Random Forest with GridSearchCV...")
    grid_search.fit(X_train, y_train)
    
    best_model = grid_search.best_estimator_
    print(f"\nBest params: {grid_search.best_params_}")
    print(f"Best cross-validation score: {grid_search.best_score_:.4f}")
    
    # Evaluate
    y_pred = best_model.predict(X_test)
    y_pred_proba = best_model.predict_proba(X_test)[:, 1]

    print("\n--- Evaluation on Test Set ---")
    print("Classification Report:")
    print(classification_report(y_test, y_pred))
    
    print("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    
    print("ROC AUC Score:")
    print(f"{roc_auc_score(y_test, y_pred_proba):.4f}")
    
    # Feature Importances
    importances = best_model.feature_importances_
    sorted_idx = np.argsort(importances)[::-1]
    
    print("\nFeature Importances:")
    for i in sorted_idx:
        print(f"{feature_cols[i]}: {importances[i]:.4f}")
        
    # Save artifacts
    artifacts_dir = Path(r"c:\Users\saran\Desktop\sih\backend\ml\artifacts")
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    
    model_path = artifacts_dir / "rf_model.joblib"
    features_path = artifacts_dir / "feature_names.json"
    
    joblib.dump(best_model, model_path)
    print(f"\nModel saved to {model_path}")
    
    with open(features_path, 'w') as f:
        json.dump(feature_cols, f)
    print(f"Feature names saved to {features_path}")

if __name__ == '__main__':
    main()

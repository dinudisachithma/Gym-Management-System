from flask import Flask, request, jsonify
import joblib
import pandas as pd
import os

app = Flask(__name__)

# Path to combined model file
MODEL_PATH = 'models/best_churn_model.pkl'

# Safe model loading
try:
    if os.path.exists(MODEL_PATH):
        loaded_objects = joblib.load(MODEL_PATH)
        # Handle both formats: tuple (model, preprocessor) OR single Pipeline
        if isinstance(loaded_objects, tuple):
            model, preprocessor = loaded_objects
        else:
            # Pipeline already includes preprocessing inside it
            model = loaded_objects
            preprocessor = None
        MODEL_LOADED = True
    else:
        model = None
        preprocessor = None
        MODEL_LOADED = False
except Exception as e:
    print("Model loading failed:", e)
    model = None
    preprocessor = None
    MODEL_LOADED = False


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'model_loaded': MODEL_LOADED
    })


@app.route('/predict', methods=['POST'])
def predict_churn():
    try:
        data = request.json or {}

        features = {
            'membership_duration_days': data.get('membership_duration_days', 0),
            'total_visits': data.get('total_visits', 0),
            'days_since_last_visit': data.get('days_since_last_visit', 30),
            'payment_delays': data.get('payment_delays', 0),
            'average_session_duration': data.get('average_session_duration', 60.0),
            'feedback_score': data.get('feedback_score', 3.5),
        }

        if MODEL_LOADED:
            df = pd.DataFrame([features])
            if preprocessor is not None:
                # Old format: separate preprocessor + model
                processed_data = preprocessor.transform(df)
                churn_probability = model.predict_proba(processed_data)[0][1]
            else:
                # New format: Pipeline handles preprocessing internally
                churn_probability = model.predict_proba(df)[0][1]
        else:
            # Fallback logic if model file is missing / failed to load
            risk_score = 0.0

            if features['days_since_last_visit'] > 30:
                risk_score += 0.3
            elif features['days_since_last_visit'] > 14:
                risk_score += 0.1

            if features['total_visits'] < 5:
                risk_score += 0.2

            if features['feedback_score'] < 3.0:
                risk_score += 0.2

            risk_score += features['payment_delays'] * 0.1
            risk_score = min(risk_score, 0.9)
            churn_probability = risk_score

        if churn_probability < 0.3:
            risk_level = 'Low'
        elif churn_probability < 0.7:
            risk_level = 'Medium'
        else:
            risk_level = 'High'

        return jsonify({
            'churn_probability': float(churn_probability),
            'risk_level': risk_level,
            'confidence': 'high' if churn_probability > 0.8 or churn_probability < 0.2 else 'medium',
            'model_loaded': MODEL_LOADED
        })

    except Exception as e:
        return jsonify({
            'error': str(e),
            'model_loaded': MODEL_LOADED
        }), 400


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
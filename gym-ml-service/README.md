# Gym Churn Prediction ML Service

This service provides churn prediction for gym members using a trained machine learning model.

## Setup Instructions

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Add Your Trained Model

You need to save your trained model and preprocessing pipeline in the `models/` directory.

#### Option A: Use the Example Script
1. Modify `save_model_example.py` with your actual training code
2. Run the script:
```bash
python save_model_example.py
```

#### Option B: Save Your Existing Model
If you already have a trained model, save it like this:

```python
import joblib

# Assuming you have your trained model and preprocessor
joblib.dump(your_trained_model, 'models/churn_model.pkl')
joblib.dump(your_preprocessor, 'models/preprocessor.pkl')
```

### 3. Model Requirements

Your model should expect these features:
- `membership_duration_days`: Integer (days since membership started)
- `total_visits`: Integer (total number of gym visits)
- `days_since_last_visit`: Integer (days since last attendance)
- `payment_delays`: Integer (number of delayed payments)
- `average_session_duration`: Float (average minutes per session)
- `feedback_score`: Float (average feedback rating 1-5)

Your model should output probabilities using `predict_proba()` method.

### 4. Run the Service

#### Development Mode:
```bash
python app.py
```

#### Production Mode (Docker):
```bash
docker build -t gym-ml-service .
docker run -p 5000:5000 gym-ml-service
```

### 5. Test the Service

Test with curl:
```bash
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "membership_duration_days": 30,
    "total_visits": 15,
    "days_since_last_visit": 7,
    "payment_delays": 0,
    "average_session_duration": 65.0,
    "feedback_score": 4.2
  }'
```

Expected response:
```json
{
  "churn_probability": 0.15,
  "risk_level": "Low",
  "confidence": "high",
  "model_loaded": true
}
```

## API Endpoints

- `GET /health`: Health check
- `POST /predict`: Get churn prediction for a member

## Integration with Spring Boot

The service is configured to work with the Spring Boot application. Make sure the `ML_SERVICE_URL` in `application.properties` points to this service.

## Troubleshooting

1. **Model not loading**: Check that `models/churn_model.pkl` and `models/preprocessor.pkl` exist
2. **Prediction errors**: Verify your model accepts the expected features
3. **Connection issues**: Ensure the service is running on port 5000

## Model Training Tips

1. **Feature Engineering**: Consider additional features like:
   - Visit frequency patterns
   - Seasonal trends
   - Membership tier
   - Age and demographics

2. **Model Selection**: Good algorithms for churn prediction:
   - Random Forest
   - Gradient Boosting (XGBoost, LightGBM)
   - Logistic Regression
   - Neural Networks

3. **Evaluation**: Use AUC-ROC, precision, recall, and F1-score for evaluation
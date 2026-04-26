# SIMPLE GUIDE: Add Your Churn Model

## STEP 1: Install Python packages
Run this in your terminal:
```
cd gym-ml-service
pip install flask scikit-learn pandas joblib numpy
```

## STEP 2: Create your model file
Copy your trained model code into `train_and_save_model.py`

For example, if your model code looks like this:
```python
import joblib
from sklearn.ensemble import RandomForestClassifier

# Your trained model (replace with your actual model)
model = RandomForestClassifier()
# model.fit(X_train, y_train)  # Your training code here

# Your preprocessor (replace with your actual preprocessor)
from sklearn.preprocessing import StandardScaler
preprocessor = StandardScaler()
# preprocessor.fit(X_train)  # Your fitting code here

# Save them
joblib.dump(model, 'models/churn_model.pkl')
joblib.dump(preprocessor, 'models/preprocessor.pkl')
```

## STEP 3: Run the training script
```
python train_and_save_model.py
```

## STEP 4: Check if files were created
You should see:
- models/churn_model.pkl
- models/preprocessor.pkl

## STEP 5: Test the service
```
python app.py
```
Then open another terminal:
```
python test_service.py
```

## STEP 6: Start everything
```
docker-compose up --build
```

That's it! Your model will be used automatically.
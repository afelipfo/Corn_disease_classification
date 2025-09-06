# Archivo: src/evaluate.py

import tensorflow as tf
import pathlib
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import classification_report, confusion_matrix

# Importar la función para crear los generadores
from data_pipeline import create_data_generators

def evaluate_model():
    """
    Carga el mejor modelo entrenado y lo evalúa en el conjunto de prueba.
    Genera y muestra una matriz de confusión y un reporte de clasificación.
    """
    # --- 1. CONFIGURACIÓN ---
    PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent
    
    # Directorio con los datos divididos
    SPLIT_DATA_DIR = PROJECT_ROOT / 'dataset_split_balanced'
    
    # Ruta al mejor modelo guardado por el callback
    BEST_MODEL_PATH = PROJECT_ROOT / 'models' / 'best_model.keras'
    
    IMAGE_SIZE = (224, 224)
    BATCH_SIZE = 32

    if not BEST_MODEL_PATH.exists():
        raise FileNotFoundError(f"El modelo no fue encontrado en '{BEST_MODEL_PATH}'. Asegúrate de haber entrenado primero.")

    # --- 2. PREPARAR EL CONJUNTO DE PRUEBA ---
    # No necesitamos los generadores de train y val, solo el de test.
    # Usamos el guion bajo (_) para ignorar las variables que no usaremos.
    _, _, test_generator = create_data_generators(
        base_dir=SPLIT_DATA_DIR,
        image_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE
    )

    # --- 3. CARGAR EL MODELO Y EVALUAR ---
    print(f"🧠 Cargando el mejor modelo desde: '{BEST_MODEL_PATH}'")
    model = tf.keras.models.load_model(BEST_MODEL_PATH)

    print("\n" + "="*70)
    print("📊 Evaluando el modelo en el conjunto de prueba...")
    print("="*70)
    
    # .evaluate() calcula la pérdida y las métricas en el conjunto de prueba
    loss, accuracy = model.evaluate(test_generator)
    print(f"\nExactitud en el conjunto de prueba: {accuracy * 100:.2f}%")
    print(f"Pérdida en el conjunto de prueba: {loss:.4f}")

    # --- 4. GENERAR MATRIZ DE CONFUSIÓN Y REPORTE ---
    print("\n" + "="*70)
    print("📈 Generando reporte de clasificación y matriz de confusión...")
    print("="*70)

    # Obtener las predicciones del modelo para el conjunto de prueba
    predictions = model.predict(test_generator)
    # Convertir las probabilidades (softmax) a la clase predicha (el índice más alto)
    y_pred = np.argmax(predictions, axis=1)
    
    # Obtener las etiquetas verdaderas del generador
    y_true = test_generator.classes
    
    # Mapear los índices a los nombres de las clases
    class_names = list(test_generator.class_indices.keys())

    # Imprimir el reporte de clasificación (precisión, recall, f1-score)
    print("\nReporte de Clasificación:")
    print(classification_report(y_true, y_pred, target_names=class_names))

    # Crear y visualizar la matriz de confusión
    cm = confusion_matrix(y_true, y_pred)
    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=class_names, yticklabels=class_names)
    plt.title('Matriz de Confusión', fontsize=16)
    plt.ylabel('Clase Verdadera')
    plt.xlabel('Clase Predicha')
    plt.show()

if __name__ == '__main__':
    evaluate_model()
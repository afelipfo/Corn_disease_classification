# Archivo: preprocessing/preprocess.py

import pathlib
import shutil
import random
from tqdm import tqdm
import collections
import numpy as np

def split_and_balance_dataset(base_path: pathlib.Path, output_path: pathlib.Path, split_ratios: tuple = (0.7, 0.15, 0.15)):
    """
    Realiza una división estratificada y balanceada de un dataset de imágenes.
    Utiliza submuestreo (undersampling) para que cada clase tenga el mismo
    número de imágenes en los conjuntos de train, val y test.
    """
    if not (base_path.exists() and base_path.is_dir()):
        raise FileNotFoundError(f"El directorio base '{base_path}' no existe. Asegúrate de que la carpeta '{base_path.name}' está en la raíz del proyecto.")
    
    if not np.isclose(sum(split_ratios), 1.0):
        raise ValueError("Los ratios de división (train, val, test) deben sumar 1.0.")

    class_dirs = sorted([d for d in base_path.iterdir() if d.is_dir()])
    if not class_dirs:
        raise FileNotFoundError(f"No se encontraron carpetas de clases dentro de '{base_path}'.")

    min_class_size = min(len(list(d.glob('*.[jp][pn]g'))) for d in class_dirs)
    
    print(f"⚖️ Balanceo por Submuestreo: Todas las clases se reducirán a {min_class_size} imágenes.")
    print(f"📁 Directorio de salida: {output_path}")
    print(f"📊 Ratios: Train={split_ratios[0]*100:.0f}%, Val={split_ratios[1]*100:.0f}%, Test={split_ratios[2]*100:.0f}%")

    if output_path.exists():
        print(f"⚠️ El directorio de salida '{output_path}' ya existe. Se eliminará para una nueva división.")
        shutil.rmtree(output_path)
        
    for split in ['train', 'val', 'test']:
        (output_path / split).mkdir(parents=True)

    print("\n" + "="*50)
    print("🚀 Iniciando división y balanceo del dataset...")
    print("="*50)

    final_counts = collections.defaultdict(dict)

    for class_dir in class_dirs:
        class_name = class_dir.name
        print(f"\n🔄 Procesando clase: '{class_name}'")

        for split in ['train', 'val', 'test']:
            (output_path / split / class_name).mkdir()

        all_image_paths = list(class_dir.glob('*.[jp][pn]g'))
        sampled_paths = random.sample(all_image_paths, min_class_size)
        random.shuffle(sampled_paths)

        n_train = int(min_class_size * split_ratios[0])
        n_val = int(min_class_size * split_ratios[1])
        
        train_files = sampled_paths[:n_train]
        val_files = sampled_paths[n_train : n_train + n_val]
        test_files = sampled_paths[n_train + n_val:] 

        final_counts[class_name] = {'train': len(train_files), 'val': len(val_files), 'test': len(test_files)}

        def copy_files(files, split_name):
            destination_dir = output_path / split_name / class_name
            for f in tqdm(files, desc=f"  -> Copiando a '{split_name}'", unit='img', leave=False, ncols=100):
                shutil.copy(f, destination_dir / f.name)

        copy_files(train_files, 'train')
        copy_files(val_files, 'val')
        copy_files(test_files, 'test')

    print("\n" + "="*60)
    print("✅ Proceso de división y balanceo completado exitosamente.")
    print("="*60)
    print("📊 Resumen de la Distribución Final (Balanceada):")
    header = f"{'Clase':<20} | {'Train':>7} | {'Val':>7} | {'Test':>7} | {'Total':>7}"
    print(header)
    print("-" * len(header))
    
    totals = collections.defaultdict(int)
    for class_name, counts in sorted(final_counts.items()):
        total_class = sum(counts.values())
        totals['train'] += counts['train']
        totals['val'] += counts['val']
        totals['test'] += counts['test']
        print(f"{class_name:<20} | {counts['train']:>7} | {counts['val']:>7} | {counts['test']:>7} | {total_class:>7}")
    
    print("-" * len(header))
    total_all = sum(totals.values())
    print(f"{'TOTAL':<20} | {totals['train']:>7} | {totals['val']:>7} | {totals['test']:>7} | {total_all:>7}")
    print("="*60)

if __name__ == '__main__':
    PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent
    
    # ÚNICA FUENTE DE DATOS: 'data_2'
    DATA_SOURCE = PROJECT_ROOT / 'data_2'
    
    # Directorio de salida para los datos divididos y balanceados
    OUTPUT_DIR = PROJECT_ROOT / 'dataset_split_balanced'
    
    SPLIT_RATIOS = (0.7, 0.15, 0.15)

    split_and_balance_dataset(base_path=DATA_SOURCE, output_path=OUTPUT_DIR, split_ratios=SPLIT_RATIOS)
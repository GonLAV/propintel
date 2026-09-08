import os
import sys

base_dir = r'c:\Users\gons\OneDrive - BOLT Solutions\Documents\shumagon-goni'
dirs = [
    r'saas-backend\src\config',
    r'saas-backend\src\api\v1\routes',
    r'saas-backend\src\api\v1\controllers',
    r'saas-backend\src\api\v1\services',
    r'saas-backend\src\api\v1\repositories',
    r'saas-backend\src\api\v1\validators',
    r'saas-backend\src\middleware',
    r'saas-backend\src\utils',
    r'saas-backend\src\db',
    r'saas-backend\sql',
    r'saas-backend\tests\unit',
    r'saas-backend\tests\integration',
    r'.github\workflows',
]

os.chdir(base_dir)

for d in dirs:
    try:
        os.makedirs(d, exist_ok=True)
        print(f'✓ Created: {d}')
    except Exception as e:
        print(f'✗ Error creating {d}: {e}')

print('\nAll directories created successfully!')

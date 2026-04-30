import os

base_path = r'c:\Users\gons\OneDrive - BOLT Solutions\Documents\shumagon-goni'
dirs = [
    'saas-backend\\src\\config',
    'saas-backend\\src\\api\\v1\\routes',
    'saas-backend\\src\\api\\v1\\controllers',
    'saas-backend\\src\\api\\v1\\services',
    'saas-backend\\src\\api\\v1\\repositories',
    'saas-backend\\src\\api\\v1\\validators',
    'saas-backend\\src\\middleware',
    'saas-backend\\src\\utils',
    'saas-backend\\src\\db',
    'saas-backend\\sql',
    'saas-backend\\tests\\unit',
    'saas-backend\\tests\\integration',
]

os.chdir(base_path)
for dir_path in dirs:
    os.makedirs(dir_path, exist_ok=True)
    print(f'Created: {dir_path}')

print('All directories created successfully!')

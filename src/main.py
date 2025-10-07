import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_cors import CORS
from src.routes.barcode import barcode_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size

# Configurar CORS para permitir requisições do frontend
CORS(app, origins=['*'])

# Registrar apenas o blueprint do barcode (sem user por enquanto)
app.register_blueprint(barcode_bp, url_prefix='/api/barcode')

@app.route('/health')
def health_check():
    return {"status": "healthy", "message": "Backend is running"}

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path == "":
        return {"message": "CompilaPDF Backend API", "status": "running", "endpoints": ["/api/barcode", "/health"]}
    
    static_folder_path = app.static_folder
    if static_folder_path and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        return {"error": "Not found"}, 404

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    app.run(host='0.0.0.0', port=port, debug=False)

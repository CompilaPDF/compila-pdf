import os
import tempfile
import shutil
from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
from src.barcode_system_simple import SimpleBarcodeMatchingSystem
import zipfile

barcode_bp = Blueprint('barcode', __name__)

ALLOWED_EXTENSIONS = {'pdf'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@barcode_bp.route('/process', methods=['POST'])
def process_files():
    """
    Endpoint para processar arquivos de guias e comprovantes.
    Espera arquivos multipart/form-data com campos 'guias' e 'comprovantes'.
    """
    try:
        # Verificar se os arquivos foram enviados
        if 'guias' not in request.files or 'comprovantes' not in request.files:
            return jsonify({'error': 'Arquivos de guias e comprovantes são obrigatórios'}), 400
        
        guias_files = request.files.getlist('guias')
        comprovantes_files = request.files.getlist('comprovantes')
        
        # Verificar se pelo menos um arquivo de cada tipo foi enviado
        if len(guias_files) == 0 or len(comprovantes_files) == 0:
            return jsonify({'error': 'Pelo menos um arquivo de cada tipo deve ser enviado'}), 400
        
        # Verificar se todos os arquivos são PDFs
        for file in guias_files + comprovantes_files:
            if file.filename == '' or not allowed_file(file.filename):
                return jsonify({'error': f'Arquivo inválido: {file.filename}. Apenas PDFs são permitidos.'}), 400
        
        # Criar diretórios temporários
        temp_dir = tempfile.mkdtemp()
        guias_dir = os.path.join(temp_dir, 'guias')
        comprovantes_dir = os.path.join(temp_dir, 'comprovantes')
        output_dir = os.path.join(temp_dir, 'output')
        
        os.makedirs(guias_dir)
        os.makedirs(comprovantes_dir)
        os.makedirs(output_dir)
        
        # Salvar arquivos de guias
        for file in guias_files:
            if file and file.filename:
                filename = secure_filename(file.filename)
                file.save(os.path.join(guias_dir, filename))
        
        # Salvar arquivos de comprovantes
        for file in comprovantes_files:
            if file and file.filename:
                filename = secure_filename(file.filename)
                file.save(os.path.join(comprovantes_dir, filename))
        
        # Processar arquivos usando o sistema de correspondência
        system = SimpleBarcodeMatchingSystem()
        result = system.process_files(guias_dir, comprovantes_dir, output_dir)
        
        # Criar um arquivo ZIP com os resultados
        zip_path = os.path.join(temp_dir, 'resultados.zip')
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            for filename in os.listdir(output_dir):
                file_path = os.path.join(output_dir, filename)
                zipf.write(file_path, filename)
        
        # Preparar resposta
        response_data = {
            'success': True,
            'results': result,
            'download_available': len(result['matches']) > 0
        }
        
        # Se houver correspondências, incluir o link para download
        if len(result['matches']) > 0:
            # Mover o arquivo ZIP para um local acessível
            static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'downloads')
            os.makedirs(static_dir, exist_ok=True)
            final_zip_path = os.path.join(static_dir, 'resultados.zip')
            shutil.move(zip_path, final_zip_path)
            response_data['download_url'] = '/downloads/resultados.zip'
        
        # Limpar diretório temporário
        shutil.rmtree(temp_dir)
        
        return jsonify(response_data)
        
    except Exception as e:
        return jsonify({'error': f'Erro interno do servidor: {str(e)}'}), 500

@barcode_bp.route('/download/<filename>')
def download_file(filename):
    """
    Endpoint para download de arquivos processados.
    """
    try:
        static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'downloads')
        return send_file(os.path.join(static_dir, filename), as_attachment=True)
    except Exception as e:
        return jsonify({'error': f'Arquivo não encontrado: {str(e)}'}), 404

@barcode_bp.route('/health')
def health_check():
    """
    Endpoint para verificar se o serviço está funcionando.
    """
    return jsonify({'status': 'ok', 'message': 'Serviço de correspondência de códigos de barras funcionando'})

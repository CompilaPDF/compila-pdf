import os
import re
import tempfile
import shutil
from PyPDF2 import PdfReader, PdfWriter

class SimpleBarcodeMatchingSystem:
    """
    Sistema simplificado de correspondência de códigos de barras
    que usa apenas extração de texto para encontrar códigos.
    """
    
    def __init__(self):
        self.barcode_patterns = [
            r'\b\d{47,48}\b',  # Código de barras bancário padrão
            r'\b\d{44}\b',     # Código de barras alternativo
            r'\b\d{11,12}\b',  # Códigos menores
            r'\b\d{5}\.\d{5}\s+\d{5}\.\d{6}\s+\d{5}\.\d{6}\s+\d\s+\d{14}\b',  # Formato linha digitável
        ]
    
    def extract_text_from_pdf(self, pdf_path):
        """Extrai texto de um arquivo PDF."""
        try:
            with open(pdf_path, 'rb') as file:
                reader = PdfReader(file)
                text = ""
                for page in reader.pages:
                    text += page.extract_text() + "\n"
                return text
        except Exception as e:
            print(f"Erro ao extrair texto de {pdf_path}: {e}")
            return ""
    
    def extract_barcodes_from_text(self, text):
        """Extrai códigos de barras do texto usando regex."""
        barcodes = []
        for pattern in self.barcode_patterns:
            matches = re.findall(pattern, text)
            barcodes.extend(matches)
        
        # Remover duplicatas e códigos muito curtos
        unique_barcodes = list(set([code for code in barcodes if len(code) >= 11]))
        return unique_barcodes
    
    def extract_barcodes_from_pdf(self, pdf_path):
        """Extrai códigos de barras de um arquivo PDF."""
        text = self.extract_text_from_pdf(pdf_path)
        return self.extract_barcodes_from_text(text)
    
    def normalize_barcode(self, barcode):
        """Normaliza um código de barras removendo espaços e caracteres especiais."""
        return re.sub(r'[^\d]', '', str(barcode))
    
    def find_matching_barcodes(self, barcode1, barcode2):
        """Verifica se dois códigos de barras correspondem."""
        norm1 = self.normalize_barcode(barcode1)
        norm2 = self.normalize_barcode(barcode2)
        
        # Correspondência exata
        if norm1 == norm2:
            return True
        
        # Correspondência por substring (para casos onde um código está contido no outro)
        if len(norm1) >= 11 and len(norm2) >= 11:
            if norm1 in norm2 or norm2 in norm1:
                return True
        
        return False
    
    def merge_pdfs(self, pdf1_path, pdf2_path, output_path):
        """Combina dois arquivos PDF em um único arquivo."""
        try:
            writer = PdfWriter()
            
            # Adicionar páginas do primeiro PDF
            with open(pdf1_path, 'rb') as file1:
                reader1 = PdfReader(file1)
                for page in reader1.pages:
                    writer.add_page(page)
            
            # Adicionar páginas do segundo PDF
            with open(pdf2_path, 'rb') as file2:
                reader2 = PdfReader(file2)
                for page in reader2.pages:
                    writer.add_page(page)
            
            # Salvar o arquivo combinado
            with open(output_path, 'wb') as output_file:
                writer.write(output_file)
            
            return True
        except Exception as e:
            print(f"Erro ao combinar PDFs: {e}")
            return False
    
    def process_files(self, guias_dir, comprovantes_dir, output_dir):
        """
        Processa arquivos de guias e comprovantes, fazendo correspondência por código de barras.
        """
        results = {
            'matches': [],
            'unmatched_guias': [],
            'unmatched_comprovantes': [],
            'total_matches': 0
        }
        
        # Extrair códigos de barras das guias
        guias_data = {}
        for filename in os.listdir(guias_dir):
            if filename.lower().endswith('.pdf'):
                file_path = os.path.join(guias_dir, filename)
                barcodes = self.extract_barcodes_from_pdf(file_path)
                guias_data[filename] = {
                    'path': file_path,
                    'barcodes': barcodes
                }
        
        # Extrair códigos de barras dos comprovantes
        comprovantes_data = {}
        for filename in os.listdir(comprovantes_dir):
            if filename.lower().endswith('.pdf'):
                file_path = os.path.join(comprovantes_dir, filename)
                barcodes = self.extract_barcodes_from_pdf(file_path)
                comprovantes_data[filename] = {
                    'path': file_path,
                    'barcodes': barcodes
                }
        
        # Fazer correspondências
        matched_guias = set()
        matched_comprovantes = set()
        
        for guia_name, guia_info in guias_data.items():
            for comprovante_name, comprovante_info in comprovantes_data.items():
                if comprovante_name in matched_comprovantes:
                    continue
                
                # Verificar se há correspondência entre os códigos de barras
                match_found = False
                matched_guia_barcode = ""
                matched_comprovante_barcode = ""
                
                for guia_barcode in guia_info['barcodes']:
                    for comprovante_barcode in comprovante_info['barcodes']:
                        if self.find_matching_barcodes(guia_barcode, comprovante_barcode):
                            match_found = True
                            matched_guia_barcode = guia_barcode
                            matched_comprovante_barcode = comprovante_barcode
                            break
                    if match_found:
                        break
                
                if match_found:
                    # Gerar nome do arquivo de saída baseado no nome da guia
                    base_name = os.path.splitext(guia_name)[0]
                    output_filename = f"{base_name}_compilado.pdf"
                    output_path = os.path.join(output_dir, output_filename)
                    
                    # Combinar os PDFs
                    if self.merge_pdfs(guia_info['path'], comprovante_info['path'], output_path):
                        results['matches'].append({
                            'guia': guia_name,
                            'comprovante': comprovante_name,
                            'output': output_filename,
                            'guia_barcode': matched_guia_barcode,
                            'comprovante_barcode': matched_comprovante_barcode
                        })
                        matched_guias.add(guia_name)
                        matched_comprovantes.add(comprovante_name)
                        results['total_matches'] += 1
                    break
        
        # Identificar arquivos não correspondidos
        results['unmatched_guias'] = [name for name in guias_data.keys() if name not in matched_guias]
        results['unmatched_comprovantes'] = [name for name in comprovantes_data.keys() if name not in matched_comprovantes]
        
        return results

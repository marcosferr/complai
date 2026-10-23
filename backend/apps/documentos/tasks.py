# /c:/Users/ferre/Documents/Workspace/Compliance-Tracker/backend/apps/documentos/tasks.py

import logging
import os
import json
from types import SimpleNamespace

from celery import shared_task
from django.utils import timezone

from .models import DocumentoLegal

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_path):
    """Extract text from a PDF using PyPDF2 (fast native extraction)."""
    try:
        import PyPDF2
    except ImportError:
        logger.warning("PyPDF2 not installed. Install with: pip install PyPDF2")
        return ""

    try:
        with open(file_path, "rb") as fh:
            reader = PyPDF2.PdfReader(fh)
            parts = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    parts.append(text)
            return "\n".join(parts).strip()
    except Exception as e:
        logger.error(f"Error extracting text from PDF {file_path}: {e}", exc_info=True)
        return ""


def extract_text_with_ocr(file_path):
    """
    Use pdf2image + pytesseract (and PIL) to OCR PDFs or images.
    This is slower but works for scanned documents.
    """
    try:
        from pdf2image import convert_from_path
        import pytesseract
        from PIL import Image
    except ImportError as e:
        logger.warning("OCR libraries not installed. Install: pip install pdf2image pillow pytesseract")
        logger.debug(f"Missing OCR lib: {e}")
        return ""

    _, ext = os.path.splitext(file_path)
    ext = ext.lower()

    try:
        texts = []
        if ext == ".pdf":
            # convert pages to images
            images = convert_from_path(file_path, dpi=300)
            for i, image in enumerate(images):
                page_text = pytesseract.image_to_string(image, lang="spa+eng")
                texts.append(page_text)
        else:
            # single image
            image = Image.open(file_path)
            texts.append(pytesseract.image_to_string(image, lang="spa+eng"))
        return "\n".join(texts).strip()
    except Exception as e:
        logger.error(f"OCR extraction failed for {file_path}: {e}", exc_info=True)
        return ""


def extract_text_from_docx(file_path):
    """Extract text from a DOCX file using python-docx."""
    try:
        import docx
    except ImportError:
        logger.warning("python-docx not installed. Install with: pip install python-docx")
        return ""

    try:
        doc = docx.Document(file_path)
        return "\n".join(p.text for p in doc.paragraphs).strip()
    except Exception as e:
        logger.error(f"Error extracting DOCX {file_path}: {e}", exc_info=True)
        return ""


def extract_text_from_txt(file_path):
    """Read TXT file with utf-8 fallback."""
    try:
        with open(file_path, "r", encoding="utf-8") as fh:
            return fh.read().strip()
    except UnicodeDecodeError:
        try:
            with open(file_path, "r", encoding="latin-1") as fh:
                return fh.read().strip()
        except Exception as e:
            logger.error(f"Error reading TXT {file_path}: {e}", exc_info=True)
            return ""
    except Exception as e:
        logger.error(f"Error reading TXT {file_path}: {e}", exc_info=True)
        return ""


def extract_text_from_file(file_path):
    """
    Dispatch extraction based on extension.
    For PDF: try native extraction first, fall back to OCR when little or no text found.
    """
    _, ext = os.path.splitext(file_path)
    ext = ext.lower()

    if ext == ".pdf":
        text = extract_text_from_pdf(file_path)
        if len(text.strip()) < 100:
            logger.info("PDF native text extraction was minimal, attempting OCR.")
            ocr_text = extract_text_with_ocr(file_path)
            return ocr_text if ocr_text else text
        return text
    elif ext in (".docx", ".doc"):
        return extract_text_from_docx(file_path)
    elif ext == ".txt":
        return extract_text_from_txt(file_path)
    elif ext in (".png", ".jpg", ".jpeg", ".tiff", ".bmp"):
        return extract_text_with_ocr(file_path)
    else:
        logger.warning(f"Unsupported file extension for text extraction: {ext}")
        return ""


def extract_keywords_simple(text):
    """Simple keyword extraction using a list of legal terms."""
    legal_terms = [
        "contrato", "acuerdo", "cláusula", "término", "condición",
        "obligación", "derecho", "política", "procedimiento", "normativa",
        "plazo", "vencimiento", "penalización", "multa", "garantía",
        "responsabilidad", "confidencialidad", "propiedad", "cesión"
    ]
    words = text.lower().split()
    found = []
    joined = " ".join(words)
    for term in legal_terms:
        if term in joined and term not in found:
            found.append(term)
            if len(found) >= 10:
                break
    return found


def extract_clauses_with_gpt(text, document_title=""):
    """
    Call OpenAI ChatCompletion with structured outputs to extract clauses.
    Uses the latest OpenAI API with client.chat.completions.parse() and gpt-4o-mini.
    Returns a dict with keys: resumen, clausulas, palabras_clave, tipo_documento, etc.
    If OpenAI not configured or errors occur, returns None.
    """
    # Check if AI processing is enabled
    enable_ai = os.environ.get("ENABLE_AI_PROCESSING", "true").lower() in ("true", "1", "yes")
    if not enable_ai:
        logger.info("AI processing is disabled via ENABLE_AI_PROCESSING environment variable")
        return None
    
    try:
        from openai import OpenAI
        from .schemas import DocumentoAnalisisResponse
    except ImportError as e:
        logger.warning(f"Required packages not installed: {e}. Install with: pip install openai pydantic")
        return None

    # Check if OpenAI API key is configured (via environment variable)
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        logger.warning("OPENAI_API_KEY not configured in environment variables.")
        return None

    try:
        # Initialize the OpenAI client (reads OPENAI_API_KEY from environment automatically)
        client = OpenAI()
        
        # Prepare the prompt for the model
        prompt = (
            f"Analiza el siguiente documento legal titulado \"{document_title}\" y extrae toda la información estructurada "
            "según el esquema proporcionado. Resume el documento en 2-3 oraciones. Identifica y extrae las cláusulas principales "
            "del documento (5-15 cláusulas), clasificándolas por categoría, importancia y si requieren acciones de cumplimiento. "
            "También extrae palabras clave, tipo de documento, partes involucradas, fechas importantes y riesgos identificados.\n\n"
            "TEXTO DEL DOCUMENTO:\n"
            f"{text[:50000]}"  # limit input length for safety
        )

        # Call OpenAI with structured outputs using the beta parse() method
        # Note: Using beta.chat.completions.parse for structured outputs with Pydantic
        completion = client.beta.chat.completions.parse(
            model="gpt-4o-mini",  # Latest efficient model with structured outputs
            messages=[
                {
                    "role": "system",
                    "content": "Eres un analista legal experto especializado en análisis de documentos legales. "
                               "Tu tarea es extraer información estructurada de documentos legales de manera precisa y completa."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            response_format=DocumentoAnalisisResponse,  # Use Pydantic model for structured output
            temperature=0.2,
        )

        # Parse the structured response
        message = completion.choices[0].message
        
        if message.parsed:
            # Successfully parsed structured output
            parsed_data = message.parsed
            logger.info(f"Successfully extracted {len(parsed_data.clausulas)} clauses from document")
            
            # Convert Pydantic model to dict for storage
            return {
                "resumen": parsed_data.resumen,
                "tipo_documento": parsed_data.tipo_documento,
                "clausulas": [
                    {
                        "titulo": c.titulo,
                        "contenido": c.contenido,
                        "numero_orden": c.numero_orden,
                        "categoria": c.categoria,
                        "importancia": c.importancia,
                        "requiere_accion": c.requiere_accion,
                        "aceptada": False
                    }
                    for c in parsed_data.clausulas
                ],
                "palabras_clave": parsed_data.palabras_clave,
                "fecha_mencionada": parsed_data.fecha_mencionada,
                "partes_involucradas": parsed_data.partes_involucradas,
                "riesgos_identificados": parsed_data.riesgos_identificados
            }
        elif message.refusal:
            # Model refused to respond
            logger.error(f"OpenAI model refused to process: {message.refusal}")
            return None
        else:
            logger.error("No parsed data or refusal in OpenAI response")
            return None

    except Exception as e:
        logger.error(f"OpenAI request failed: {e}", exc_info=True)
        return None


@shared_task(bind=True, max_retries=3)
def process_document(self, document_id):
    """
    Celery task: extract text (OCR if needed) and run AI clause extraction.
    Saves results into DocumentoLegal instance.
    
    Args:
        document_id: ID of the document to process
    """
    document = None
    try:
        document = DocumentoLegal.objects.get(id=document_id)
        logger.info(f"Starting document processing: {document.titulo} (ID: {document_id})")

        document.estado_procesamiento_ia = "PROCESANDO"
        document.error_procesamiento = ""
        document.save(update_fields=["estado_procesamiento_ia", "error_procesamiento"])

        file_path = document.archivo.path
        logger.info(f"Extracting text from: {file_path}")
        extracted_text = extract_text_from_file(file_path)

        if not extracted_text or len(extracted_text.strip()) < 50:
            error_msg = "No se pudo extraer texto del documento. El archivo puede estar vacío, corrupto o en un formato no soportado."
            logger.warning(f"Text extraction failed for document {document_id}")
            document.contenido_extraido = ""
            document.transcripcion_editable = ""
            document.estado_procesamiento_ia = "ERROR"
            document.error_procesamiento = error_msg
            document.fecha_procesamiento = timezone.now()
            document.save()
            return {"status": "error", "message": error_msg}

        # Save extracted text
        document.contenido_extraido = extracted_text
        document.transcripcion_editable = extracted_text
        logger.info(f"Extracted {len(extracted_text)} characters from document")

        # AI extraction
        logger.info(f"Starting AI clause extraction for document {document_id}")
        ai_result = extract_clauses_with_gpt(extracted_text, document.titulo)

        if ai_result:
            # ai_result is a dict with structured data from OpenAI
            document.resumen_ia = ai_result.get("resumen", "")
            palabras = ai_result.get("palabras_clave", []) or []
            document.palabras_clave = palabras

            # Clauses are already in the correct format from structured outputs
            clausulas_list = ai_result.get("clausulas", [])
            document.clausulas_extraidas_ia = clausulas_list

            # Extract and map document type
            tipo = ai_result.get("tipo_documento")
            if tipo and not document.tipo:
                tipo_map = {
                    "Contrato": "CONTRATO",
                    "Acuerdo": "ACUERDO",
                    "Política": "POLITICA",
                    "Normativa": "NORMATIVA"
                }
                document.tipo = tipo_map.get(tipo, document.tipo)

            # Set tags from keywords if not already set
            if not document.etiquetas and palabras:
                document.etiquetas = palabras[:5]

            # Log additional extracted information
            partes = ai_result.get("partes_involucradas", [])
            if partes:
                logger.info(f"Identified parties: {', '.join(partes)}")
            
            riesgos = ai_result.get("riesgos_identificados", [])
            if riesgos:
                logger.info(f"Identified risks: {', '.join(riesgos)}")
            
            fecha = ai_result.get("fecha_mencionada")
            if fecha:
                logger.info(f"Important date mentioned: {fecha}")

            document.estado_procesamiento_ia = "COMPLETADO"
            logger.info(f"AI extraction successful. Found {len(clausulas_list)} clauses")
        else:
            # AI not available; use fallback keywords
            document.resumen_ia = "Texto extraído exitosamente. Configure OPENAI_API_KEY para análisis con IA."
            document.palabras_clave = extract_keywords_simple(extracted_text)
            document.clausulas_extraidas_ia = []
            document.estado_procesamiento_ia = "COMPLETADO"
            logger.warning(f"AI extraction not available for document {document_id}")

        if document.estado == "BORRADOR":
            document.estado = "ACTIVO"

        document.fecha_procesamiento = timezone.now()
        document.save()

        logger.info(f"Document {document_id} processed successfully")
        return {
            "status": "success",
            "document_id": document_id,
            "clausulas_count": len(document.clausulas_extraidas_ia or [])
        }

    except DocumentoLegal.DoesNotExist:
        error_msg = f"Document {document_id} not found"
        logger.error(error_msg)
        return {"status": "error", "message": error_msg}

    except Exception as exc:
        error_msg = f"Error processing document: {str(exc)}"
        logger.error(error_msg, exc_info=True)
        if document:
            document.estado_procesamiento_ia = "ERROR"
            document.error_procesamiento = error_msg
            document.fecha_procesamiento = timezone.now()
            document.save()

        # Retry with exponential backoff
        try:
            if self.request.retries < self.max_retries:
                countdown = 60 * (2 ** self.request.retries)
                logger.info(f"Retrying document {document_id} in {countdown} seconds")
                raise self.retry(exc=exc, countdown=countdown)
        except AttributeError:
            # In case task isn't correctly bound; just return error
            logger.debug("Task not bound, can't retry.")

        return {"status": "error", "message": error_msg}


@shared_task(bind=True, max_retries=3)
def process_addendum(self, adenda_id):
    """
    Process an addendum document - extract text and content
    Similar to process_document but for addendums
    """
    from .models import Adenda
    
    logger.info(f"Starting addendum processing for adenda_id={adenda_id}")
    return _process_addendum_impl(self, adenda_id)


def _process_addendum_impl(task, adenda_id):
    """Internal implementation of addendum processing"""
    from .models import Adenda
    from django.utils import timezone
    
    adenda = None
    
    try:
        adenda = Adenda.objects.get(pk=adenda_id)
        adenda.estado_procesamiento_ia = "PROCESANDO"
        adenda.save(update_fields=['estado_procesamiento_ia'])
        
        logger.info(f"Processing addendum {adenda_id}: {adenda.titulo}")
        
        # Extract text from file
        file_path = adenda.archivo.path
        extracted_text = extract_text_from_file(file_path)
        
        if not extracted_text:
            raise ValueError("No se pudo extraer texto del archivo de adenda")
        
        adenda.contenido_extraido = extracted_text
        logger.info(f"Extracted {len(extracted_text)} characters from addendum")
        
        # Mark as completed
        adenda.estado_procesamiento_ia = "COMPLETADO"
        adenda.save()
        
        logger.info(f"Addendum {adenda_id} processed successfully")
        return {
            "status": "success",
            "adenda_id": adenda_id
        }
        
    except Adenda.DoesNotExist:
        error_msg = f"Addendum {adenda_id} not found"
        logger.error(error_msg)
        return {"status": "error", "message": error_msg}
    
    except Exception as exc:
        error_msg = f"Error processing addendum: {str(exc)}"
        logger.error(error_msg, exc_info=True)
        if adenda:
            adenda.estado_procesamiento_ia = "ERROR"
            adenda.save(update_fields=['estado_procesamiento_ia'])
        
        # Retry with exponential backoff
        try:
            if task.request.retries < task.max_retries:
                countdown = 60 * (2 ** task.request.retries)
                logger.info(f"Retrying addendum {adenda_id} in {countdown} seconds")
                raise task.retry(exc=exc, countdown=countdown)
        except AttributeError:
            logger.debug("Task not bound, can't retry.")
        
        return {"status": "error", "message": error_msg}

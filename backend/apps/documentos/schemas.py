"""
Pydantic schemas for OpenAI structured outputs
Used for extracting clauses from legal documents with GPT-4o-mini
"""
from pydantic import BaseModel, Field
from typing import List, Optional


class ClausulaExtraccion(BaseModel):
    """Schema for a single extracted clause from a legal document"""
    titulo: str = Field(
        description="The title or heading of the clause"
    )
    contenido: str = Field(
        description="The full content/text of the clause"
    )
    numero_orden: int = Field(
        description="The sequential order number of the clause in the document (starting from 1)"
    )
    categoria: Optional[str] = Field(
        default=None,
        description="Category or type of the clause (e.g., 'Obligaciones', 'Plazos', 'Penalizaciones', 'Terminación')"
    )
    importancia: Optional[str] = Field(
        default="MEDIA",
        description="Importance level: ALTA, MEDIA, or BAJA"
    )
    requiere_accion: bool = Field(
        default=False,
        description="Whether this clause requires compliance actions or monitoring"
    )


class DocumentoAnalisisResponse(BaseModel):
    """Schema for the complete document analysis response from OpenAI"""
    resumen: str = Field(
        description="A concise 2-3 sentence summary of the entire document"
    )
    tipo_documento: Optional[str] = Field(
        default=None,
        description="The type of document (e.g., Contrato, Acuerdo, Política, Normativa)"
    )
    clausulas: List[ClausulaExtraccion] = Field(
        description="List of extracted clauses from the document"
    )
    palabras_clave: List[str] = Field(
        description="5-15 important keywords or terms from the document"
    )
    fecha_mencionada: Optional[str] = Field(
        default=None,
        description="Any important dates mentioned in the document (format: YYYY-MM-DD if found)"
    )
    partes_involucradas: List[str] = Field(
        default_factory=list,
        description="List of parties or entities involved in the document"
    )
    riesgos_identificados: List[str] = Field(
        default_factory=list,
        description="Potential risks or liabilities identified in the document"
    )

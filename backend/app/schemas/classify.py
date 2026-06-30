from pydantic import BaseModel, ConfigDict, Field


class DocumentTagMetadata(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    faculty: str | None = None
    subject: str | None = None
    type: str | None = Field(None, validation_alias="doc_type", serialization_alias="type")
    year: str | None = None


class TaxonomyNode(BaseModel):
    level: str
    slug: str
    label: str
    count: int = 0
    children: list["TaxonomyNode"] = []


TaxonomyNode.model_rebuild()

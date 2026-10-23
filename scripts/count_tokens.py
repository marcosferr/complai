import sys
from pathlib import Path

try:
    import tiktoken
except Exception as e:
    print("tiktoken is not installed. Please install it with: python -m pip install tiktoken")
    raise


def count_tokens(file_path: Path, model: str = "gpt-4") -> int:
    enc = tiktoken.encoding_for_model(model)
    text = file_path.read_text(encoding="utf-8")
    tokens = enc.encode(text)
    return len(tokens)


if __name__ == '__main__':
    repo_root = Path(__file__).resolve().parents[1]
    contrato = repo_root / "backend" / "demo" / "contrato_uni_ejemplo.json"
    if not contrato.exists():
        print(f"File not found: {contrato}")
        sys.exit(1)
    count = count_tokens(contrato, model="gpt-4")
    print(f"Tokens (gpt-4) in {contrato.name}: {count}")

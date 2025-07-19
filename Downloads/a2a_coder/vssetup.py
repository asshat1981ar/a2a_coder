#!/usr/bin/env python3
import os
import glob
import sys
import tempfile
import unittest

# Directory scanning for files matching extensions
def scan_files(root_dir, extensions):
    """
    Return a list of file paths under root_dir matching any of the given extensions.
    """
    filepaths = []
    for ext in extensions:
        pattern = os.path.join(root_dir, f"**/*{ext}")
        filepaths.extend(glob.glob(pattern, recursive=True))
    return filepaths

# Document loading using langchain
def load_documents_from_filepaths(filepaths):
    """
    Load text documents from the given file paths using LangChain's TextLoader.
    Exits with an instructional message if langchain is not installed.
    """
    try:
        from langchain.document_loaders import TextLoader
    except ModuleNotFoundError as e:
        print(f"[Error] Missing dependency: {e}")
        print("Please install dependencies before running: pip install langchain openai faiss-cpu")
        sys.exit(1)
    documents = []
    for filepath in filepaths:
        try:
            loader = TextLoader(filepath, encoding='utf-8')
            documents.extend(loader.load())
        except Exception as e:
            print(f"[Warning] Could not load {filepath}: {e}")
    return documents

# Text splitting using langchain
def split_documents(docs, chunk_size=1000, chunk_overlap=200):
    """
    Split a list of LangChain Document objects into smaller chunks.
    Exits with an instructional message if langchain is not installed.
    """
    try:
        from langchain.text_splitter import RecursiveCharacterTextSplitter
    except ModuleNotFoundError as e:
        print(f"[Error] Missing dependency: {e}")
        print("Please install dependencies before running: pip install langchain openai faiss-cpu")
        sys.exit(1)
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap
    )
    return splitter.split_documents(docs)

# Vector store construction using langchain
def build_vector_store(chunks):
    """
    Build a FAISS vector store from document chunks using OpenAI embeddings.
    Exits with an instructional message if langchain or dependencies are missing.
    """
    try:
        from langchain.embeddings import OpenAIEmbeddings
        from langchain.vectorstores import FAISS
    except ModuleNotFoundError as e:
        print(f"[Error] Missing dependency: {e}")
        print("Please install dependencies before running: pip install langchain openai faiss-cpu")
        sys.exit(1)
    embeddings = OpenAIEmbeddings()
    return FAISS.from_documents(chunks, embeddings)

# Main entry point
def main():
    # Ensure OpenAI API key is set
    if not os.getenv("OPENAI_API_KEY"):
        print("[Error] Please set the OPENAI_API_KEY environment variable.")
        sys.exit(1)

    # Determine project root and file extensions
    root_dir = os.path.abspath(os.path.dirname(__file__))
    extensions = [".py", ".ts", ".js", ".md", ".json", ".yaml", ".yml", ".txt"]
    print(f"Scanning for documents in {root_dir}...")

    # Scan, load, split, and build the vector store
    filepaths = scan_files(root_dir, extensions)
    print(f"Found {len(filepaths)} files matching extensions.")

    docs = load_documents_from_filepaths(filepaths)
    print(f"Loaded {len(docs)} raw Document objects.")

    chunks = split_documents(docs)
    print(f"Split into {len(chunks)} chunks.")

    vector_store = build_vector_store(chunks)
    print("Built vector store, saving locally...")

    save_path = os.path.join(root_dir, "vector_store")
    os.makedirs(save_path, exist_ok=True)
    vector_store.save_local(save_path)
    print(f"Vector store saved to: {save_path}")

# Unit tests for scan_files only
class ScanFilesTest(unittest.TestCase):
    def test_empty_directory(self):
        with tempfile.TemporaryDirectory() as tmp:
            paths = scan_files(tmp, ['.txt'])
            self.assertEqual(paths, [])

    def test_single_and_nested_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            sub = os.path.join(tmp, 'subdir')
            os.makedirs(sub, exist_ok=True)
            f1 = os.path.join(tmp, 'file1.txt')
            f2 = os.path.join(sub, 'file2.md')
            with open(f1, 'w') as f: f.write('hello')
            with open(f2, 'w') as f: f.write('world')
            paths = scan_files(tmp, ['.txt', '.md'])
            self.assertCountEqual(paths, [f1, f2])

if __name__ == "__main__":
    # If invoked with 'test', run unit tests; otherwise run main pipeline
    if len(sys.argv) > 1 and sys.argv[1] == 'test':
        unittest.main(argv=[sys.argv[0]])
    else:
        main()

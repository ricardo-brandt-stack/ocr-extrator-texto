const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const dropText = document.getElementById('drop-text');
const preview = document.getElementById('preview');
const processBtn = document.getElementById('process-btn');
const copyBtn = document.getElementById('copy-btn');
const progressBar = document.getElementById('progress-bar');
const progressContainer = document.getElementById('progress-container');
const statusText = document.getElementById('status-text');
const resultText = document.getElementById('result-text');

let selectedFile = null;

// Manipulação de Arquivo / Drag & Drop
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--accent-color)';
});

dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = 'var(--border-color)';
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--border-color)';
    if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0]);
    }
});

function handleFile(file) {
    if (file && file.type.startsWith('image/')) {
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
            preview.style.display = 'block';
            dropText.style.display = 'none';
            processBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    } else {
        alert('Por favor, selecione um arquivo de imagem válido (PNG/JPG).');
    }
}

// Processamento OCR via Tesseract.js
processBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    processBtn.disabled = true;
    progressContainer.style.display = 'block';
    statusText.innerText = 'Carregando motor OCR...';
    progressBar.style.width = '10%';

    try {
        const worker = await Tesseract.createWorker('por'); // Suporte nativo para Português

        worker.logger = (m) => {
            if (m.status === 'recognizing text') {
                statusText.innerText = `Processando texto: ${Math.round(m.progress * 100)}%`;
                progressBar.style.width = `${Math.round(m.progress * 100)}%`;
            } else if (m.status) {
                statusText.innerText = m.status;
            }
        };

        const ret = await worker.recognize(selectedFile);
        resultText.value = ret.data.text;
        
        statusText.innerText = 'Concluído com sucesso!';
        copyBtn.disabled = false;
        await worker.terminate();
    } catch (error) {
        console.error(error);
        statusText.innerText = 'Erro ao processar a imagem.';
    } finally {
        processBtn.disabled = false;
    }
});

// Copiar Texto
copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(resultText.value);
    alert('Texto copiado para a área de transferência!');
});
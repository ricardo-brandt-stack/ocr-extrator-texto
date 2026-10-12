// Configuração da worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const dropText = document.getElementById('drop-text');
const fileInfo = document.getElementById('file-info');
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
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
        selectedFile = file;
        fileInfo.innerText = `Arquivo selecionado: ${file.name}`;
        fileInfo.style.display = 'block';
        dropText.style.display = 'none';
        processBtn.disabled = false;
    } else {
        alert('Por favor, selecione uma imagem (PNG/JPG) ou um arquivo PDF válido.');
    }
}

// Processamento OCR
processBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    processBtn.disabled = true;
    progressContainer.style.display = 'block';
    statusText.innerText = 'Iniciando motor OCR...';
    progressBar.style.width = '5%';
    resultText.value = '';

    try {
        const worker = await Tesseract.createWorker('por');

        if (selectedFile.type === 'application/pdf') {
            await processPDF(selectedFile, worker);
        } else {
            await processImage(selectedFile, worker);
        }

        statusText.innerText = 'Extração concluída com sucesso!';
        copyBtn.disabled = false;
        await worker.terminate();
    } catch (error) {
        console.error(error);
        statusText.innerText = 'Ocorreu um erro ao processar o arquivo.';
    } finally {
        processBtn.disabled = false;
    }
});

async function processImage(file, worker) {
    worker.logger = (m) => {
        if (m.status === 'recognizing text') {
            const prog = Math.round(m.progress * 100);
            statusText.innerText = `Lendo imagem: ${prog}%`;
            progressBar.style.width = `${prog}%`;
        }
    };
    const res = await worker.recognize(file);
    resultText.value = res.data.text;
}

async function processPDF(file, worker) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;
    let fullText = '';

    for (let i = 1; i <= totalPages; i++) {
        statusText.innerText = `Processando página ${i} de ${totalPages}...`;
        progressBar.style.width = `${Math.round((i / totalPages) * 100)}%`;

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport }).promise;

        const res = await worker.recognize(canvas);
        fullText += `--- Página ${i} ---\n` + res.data.text + '\n\n';
    }

    resultText.value = fullText;
}

// Copiar Texto
copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(resultText.value);
    alert('Texto copiado com sucesso!');
});

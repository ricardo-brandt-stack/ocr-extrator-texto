// Configuração segura do PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

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
const themeToggleBtn = document.getElementById('theme-toggle');

let selectedFile = null;

// GESTÃO DO MODO ESCURO / CLARO
themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    themeToggleBtn.innerText = isDark ? '🌙 Escuro' : '☀️ Claro';
});

// ARQUIVOS & DRAG AND DROP
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
        alert('Selecione uma imagem válida (PNG/JPG) ou um arquivo PDF.');
    }
}

// EXECUÇÃO DO OCR
processBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    processBtn.disabled = true;
    progressContainer.style.display = 'block';
    statusText.innerText = 'Inicializando motor de leitura...';
    progressBar.style.width = '5%';
    resultText.value = '';

    try {
        if (selectedFile.type === 'application/pdf') {
            await processPDF(selectedFile);
        } else {
            await processImage(selectedFile);
        }

        statusText.innerText = 'Concluído com sucesso!';
        copyBtn.disabled = false;
    } catch (error) {
        console.error(error);
        statusText.innerText = 'Erro ao processar o arquivo. Verifique o console.';
    } finally {
        processBtn.disabled = false;
    }
});

// PROCESSAR IMAGEM
async function processImage(file) {
    const worker = await Tesseract.createWorker({
        logger: m => {
            if (m.status === 'recognizing text') {
                const prog = Math.round(m.progress * 100);
                statusText.innerText = `Lendo imagem: ${prog}%`;
                progressBar.style.width = `${prog}%`;
            } else if (m.status) {
                statusText.innerText = m.status;
            }
        }
    });

    await worker.load();
    await worker.loadLanguage('por');
    await worker.initialize('por');

    const res = await worker.recognize(file);
    resultText.value = res.data.text;
    await worker.terminate();
}

// PROCESSAR PDF
async function processPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;
    let fullText = '';

    const worker = await Tesseract.createWorker();
    await worker.load();
    await worker.loadLanguage('por');
    await worker.initialize('por');

    for (let i = 1; i <= totalPages; i++) {
        statusText.innerText = `Processando página ${i} de ${totalPages}...`;
        progressBar.style.width = `${Math.round((i / totalPages) * 100)}%`;

        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport }).promise;

        const res = await worker.recognize(canvas);
        fullText += `--- Página ${i} ---\n` + res.data.text + '\n\n';
    }

    resultText.value = fullText;
    await worker.terminate();
}

// COPIAR TEXTO
copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(resultText.value);
    alert('Texto copiado para a área de transferência!');
});

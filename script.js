document.addEventListener('DOMContentLoaded', () => {
    // Configuração do worker do PDF.js
    if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    }

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

    // 1. ALTERNÂNCIA DE TEMA (DARK / LIGHT)
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        themeToggleBtn.innerText = isDark ? '🌙 Escuro' : '☀️ Claro';
    });

    // 2. EVENTOS DE ARQUIVO E DRAG & DROP
    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

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
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    function handleFile(file) {
        if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
            selectedFile = file;
            fileInfo.innerText = `Arquivo carregado: ${file.name}`;
            fileInfo.style.display = 'block';
            dropText.style.display = 'none';
            processBtn.disabled = false;
        } else {
            alert('Por favor, selecione uma imagem (PNG/JPG) ou um documento PDF válido.');
        }
    }

    // 3. EXECUÇÃO DO OCR
    processBtn.addEventListener('click', async () => {
        if (!selectedFile) return;

        if (!window.Tesseract) {
            alert('A biblioteca Tesseract ainda está carregando. Por favor, aguarde alguns segundos.');
            return;
        }

        processBtn.disabled = true;
        progressContainer.style.display = 'block';
        statusText.innerText = 'Inicializando motor OCR...';
        progressBar.style.width = '5%';
        resultText.value = '';

        try {
            if (selectedFile.type === 'application/pdf') {
                await processPDF(selectedFile);
            } else {
                await processImage(selectedFile);
            }

            statusText.innerText = 'Extração concluída com sucesso!';
            copyBtn.disabled = false;
        } catch (error) {
            console.error('Erro no processamento OCR:', error);
            statusText.innerText = 'Ocorreu um erro ao processar o arquivo.';
        } finally {
            processBtn.disabled = false;
        }
    });

    // LEITURA DE IMAGENS
    async function processImage(file) {
        const worker = await Tesseract.createWorker({
            logger: m => {
                if (m.status === 'recognizing text') {
                    const prog = Math.round(m.progress * 100);
                    statusText.innerText = `Processando imagem: ${prog}%`;
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

    // LEITURA DE PDF
    async function processPDF(file) {
        if (!window.pdfjsLib) {
            throw new Error('PDF.js não foi carregado corretamente.');
        }

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

    // 4. COPIAR RESULTADO
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(resultText.value);
        alert('Texto copiado para a área de transferência!');
    });
});

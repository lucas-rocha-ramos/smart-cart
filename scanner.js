// ================================================================
// SCANNER.JS - Leitor de código de barras
// ================================================================

class BarcodeScanner {
    constructor() {
        this.stream = null;
        this.isScanning = false;
        this.onScan = null;
        this.videoElement = null;
        this.canvasElement = null;
        this.ctx = null;
        this.scanTimeout = null;
        this.lastBarcode = '';
    }

    /**
     * Inicia a câmera para leitura
     */
    async iniciarCamera(onScan, deviceId = null) {
        if (this.isScanning) {
            await this.pararCamera();
        }

        this.onScan = onScan;

        try {
            if (!this.videoElement) {
                this.videoElement = document.createElement('video');
                this.videoElement.setAttribute('playsinline', '');
                this.videoElement.setAttribute('autoplay', '');
                
                this.canvasElement = document.createElement('canvas');
                this.ctx = this.canvasElement.getContext('2d');
            }

            const constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    deviceId: deviceId ? { exact: deviceId } : undefined
                },
                audio: false
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoElement.srcObject = this.stream;
            await this.videoElement.play();

            this.isScanning = true;
            this.scanLoop();

            return true;
        } catch (error) {
            console.error('Erro ao iniciar câmera:', error);
            alert('Não foi possível acessar a câmera.');
            return false;
        }
    }

    /**
     * Loop de leitura
     */
    scanLoop() {
        if (!this.isScanning) return;

        if (this.videoElement.readyState === 4) {
            const width = this.videoElement.videoWidth;
            const height = this.videoElement.videoHeight;
            
            this.canvasElement.width = width;
            this.canvasElement.height = height;
            this.ctx.drawImage(this.videoElement, 0, 0, width, height);

            this.lerCodigoBarras(width, height);
        }

        requestAnimationFrame(() => this.scanLoop());
    }

    /**
     * Tenta ler código de barras
     */
    lerCodigoBarras(width, height) {
        try {
            const imageData = this.ctx.getImageData(0, 0, width, height);
            const code = this.detectarCodigoBarras(imageData);
            
            if (code && code !== this.lastBarcode) {
                this.lastBarcode = code;
                if (this.onScan) {
                    this.onScan(code);
                }
                clearTimeout(this.scanTimeout);
                this.scanTimeout = setTimeout(() => {
                    this.lastBarcode = '';
                }, 500);
            }
        } catch (error) {}
    }

    /**
     * Detecta código de barras (simplificado para demo)
     */
    detectarCodigoBarras(imageData) {
        // Em produção: usar QuaggaJS ou ZXing
        const data = imageData.data;
        let darkPixels = 0;
        const sampleStep = 10;
        
        for (let i = 0; i < data.length; i += sampleStep * 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const brightness = (r + g + b) / 3;
            if (brightness < 128) darkPixels++;
        }

        const totalSamples = Math.floor(data.length / (sampleStep * 4));
        const darkRatio = darkPixels / totalSamples;

        if (darkRatio > 0.30 && darkRatio < 0.70) {
            return this.gerarCodigoBarrasAleatorio();
        }

        return null;
    }

    /**
     * Gera código aleatório para demo
     */
    gerarCodigoBarrasAleatorio() {
        const prefixos = ['789', '790', '791', '792', '793', '794', '795'];
        const prefixo = prefixos[Math.floor(Math.random() * prefixos.length)];
        let codigo = prefixo + String(Math.floor(Math.random() * 10000000000)).padStart(10, '0');
        return codigo;
    }

    /**
     * Para a câmera
     */
    async pararCamera() {
        this.isScanning = false;
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
        clearTimeout(this.scanTimeout);
        this.lastBarcode = '';
    }

    /**
     * Verifica suporte a câmera
     */
    static isCameraSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    /**
     * Lista câmeras disponíveis
     */
    static async listarCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(d => d.kind === 'videoinput');
        } catch (error) {
            console.error('Erro ao listar câmeras:', error);
            return [];
        }
    }
}

// ================================================================
// INSTÂNCIA GLOBAL
// ================================================================

const scanner = new BarcodeScanner();

// ================================================================
// FUNÇÕES DE INTEGRAÇÃO COM A UI
// ================================================================

async function abrirScannerBarras() {
    if (!BarcodeScanner.isCameraSupported()) {
        alert('Seu dispositivo não suporta câmera.');
        return;
    }

    const input = document.getElementById('barcodeInput');
    if (!input) return;

    const sucesso = await scanner.iniciarCamera(
        (codigo) => {
            input.value = codigo;
            scanner.pararCamera();
            document.getElementById('btnAddProduct')?.click();
        }
    );

    if (sucesso) {
        const btn = document.getElementById('btnScanBarcode');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Escaneando...';
        btn.style.background = '#34a853';
        
        setTimeout(() => {
            scanner.pararCamera();
            btn.innerHTML = originalText;
            btn.style.background = '';

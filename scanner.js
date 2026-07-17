// ================================================================
// SCANNER.JS - Leitor de código de barras REAL (com QuaggaJS)
// ================================================================

// Carrega o QuaggaJS via CDN
const scriptQuagga = document.createElement('script');
scriptQuagga.src = 'https://cdn.jsdelivr.net/npm/quagga@0.12.1/dist/quagga.min.js';
scriptQuagga.async = true;
document.head.appendChild(scriptQuagga);

let scannerAtivo = false;
let scannerStream = null;
let quaggaInicializado = false;
let ultimoCodigoLido = '';
let ultimaLeitura = 0;

// ================================================================
// FUNÇÃO PARA ABRIR O SCANNER
// ================================================================

async function abrirScannerBarras() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('❌ Seu dispositivo não suporta câmera.');
        return;
    }

    const input = document.getElementById('barcodeInput');
    if (!input) {
        alert('❌ Campo de entrada não encontrado.');
        return;
    }

    criarModalScanner();

    try {
        // Aguarda o QuaggaJS carregar
        if (typeof Quagga === 'undefined') {
            await new Promise((resolve) => {
                const check = setInterval(() => {
                    if (typeof Quagga !== 'undefined') {
                        clearInterval(check);
                        resolve();
                    }
                }, 100);
            });
        }

        Quagga.init({
            inputStream: {
                type: 'LiveStream',
                constraints: {
                    facingMode: 'environment',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                },
                target: document.querySelector('#scannerContainer')
            },
            decoder: {
                readers: [
                    'ean_reader',
                    'ean_8_reader',
                    'code_128_reader',
                    'code_39_reader',
                    'upc_reader',
                    'upc_e_reader'
                ],
                multiple: false
            },
            locate: true,
            numOfWorkers: 4
        }, function(err) {
            if (err) {
                console.error('❌ Erro ao iniciar Quagga:', err);
                alert('❌ Erro ao iniciar o scanner. Tente novamente.');
                fecharScanner();
                return;
            }

            console.log('✅ QuaggaJS iniciado!');
            quaggaInicializado = true;
            Quagga.start();

            Quagga.onDetected(function(result) {
                const code = result.codeResult.code;
                if (code) {
                    const agora = Date.now();
                    if (agora - ultimaLeitura > 500) {
                        ultimoCodigoLido = code;
                        ultimaLeitura = agora;
                        
                        console.log('📷 Código REAL lido:', code);
                        
                        // Feedback visual
                        const border = document.querySelector('.scan-border');
                        if (border) {
                            border.style.borderColor = '#34C759';
                            border.style.boxShadow = '0 0 50px rgba(52,199,89,0.6)';
                            setTimeout(() => {
                                border.style.borderColor = '#34C759';
                                border.style.boxShadow = '0 0 30px rgba(52,199,89,0.3)';
                            }, 300);
                        }
                        
                        // Atualiza status
                        const status = document.getElementById('scannerStatus');
                        if (status) {
                            status.textContent = '✅ Código lido: ' + code;
                            status.style.background = 'rgba(52,199,89,0.8)';
                        }
                        
                        tocarBipScanner();
                        
                        input.value = code;
                        setTimeout(() => {
                            fecharScanner();
                            document.getElementById('btnAddProduct')?.click();
                        }, 400);
                    }
                }
            });
        });

    } catch (error) {
        console.error('❌ Erro:', error);
        alert('❌ Erro ao acessar a câmera.');
        document.body.removeChild(document.getElementById('scannerModal'));
    }
}

// ================================================================
// CRIA O MODAL DO SCANNER
// ================================================================

function criarModalScanner() {
    const existing = document.getElementById('scannerModal');
    if (existing) document.body.removeChild(existing);

    const modal = document.createElement('div');
    modal.id = 'scannerModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.95);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
    `;

    modal.innerHTML = `
        <div style="position:relative;width:100%;max-width:500px;background:#000;border-radius:20px;overflow:hidden;">
            <div id="scannerContainer" style="width:100%;height:auto;min-height:300px;background:#000;"></div>
            <div class="scan-border" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
                        width:75%;height:35%;border:3px solid #34C759;border-radius:16px;
                        box-shadow:0 0 30px rgba(52,199,89,0.3);pointer-events:none;
                        transition: all 0.3s ease;">
                <div style="position:absolute;top:-3px;left:-3px;width:24px;height:24px;border-top:4px solid #34C759;border-left:4px solid #34C759;border-radius:4px 0 0 0;"></div>
                <div style="position:absolute;top:-3px;right:-3px;width:24px;height:24px;border-top:4px solid #34C759;border-right:4px solid #34C759;border-radius:0 4px 0 0;"></div>
                <div style="position:absolute;bottom:-3px;left:-3px;width:24px;height:24px;border-bottom:4px solid #34C759;border-left:4px solid #34C759;border-radius:0 0 0 4px;"></div>
                <div style="position:absolute;bottom:-3px;right:-3px;width:24px;height:24px;border-bottom:4px solid #34C759;border-right:4px solid #34C759;border-radius:0 0 4px 0;"></div>
            </div>
            <div id="scannerStatus" style="position:absolute;bottom:20px;left:50%;transform:translateX(-50%);
                        color:white;font-size:14px;background:rgba(0,0,0,0.7);padding:10px 20px;border-radius:12px;
                        font-family:-apple-system,'Inter',sans-serif;text-align:center;min-width:180px;
                        transition: all 0.3s ease;">
                📷 Posicione o código no centro
            </div>
        </div>
        <button onclick="fecharScanner()" style="margin-top:20px;background:#FF3B30;color:white;border:none;
                padding:14px 36px;border-radius:9999px;font-size:16px;font-weight:600;cursor:pointer;
                font-family:-apple-system,'Inter',sans-serif;box-shadow:0 4px 16px rgba(255,59,48,0.3);">
            <i class="fas fa-times"></i> Fechar
        </button>
    `;

    document.body.appendChild(modal);
    return modal;
}

// ================================================================
// SINAL SONORO
// ================================================================

function tocarBipScanner() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.value = 0.3;
        osc.start();
        setTimeout(() => osc.stop(), 150);
    } catch (e) {}
}

// ================================================================
// FECHA O SCANNER
// ================================================================

function fecharScanner() {
    scannerAtivo = false;
    
    if (quaggaInicializado && typeof Quagga !== 'undefined') {
        try {
            Quagga.stop();
            quaggaInicializado = false;
        } catch (e) {}
    }
    
    if (scannerStream) {
        scannerStream.getTracks().forEach(track => track.stop());
        scannerStream = null;
    }
    
    const modal = document.getElementById('scannerModal');
    if (modal) document.body.removeChild(modal);
    
    const btn = document.getElementById('btnScanBarcode');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-camera"></i> Escanear código';
        btn.style.background = '';
        btn.disabled = false;
    }
    
    const container = document.getElementById('scannerContainer');
    if (container) container.innerHTML = '';
}

// ================================================================
// TESTE MANUAL
// ================================================================

function testarCodigoBarrasManual(codigo) {
    const input = document.getElementById('barcodeInput');
    if (!input) {
        alert('Campo de entrada não encontrado.');
        return;
    }
    if (!codigo || codigo.length < 8) {
        alert('Digite um código de barras válido.');
        return;
    }
    input.value = codigo;
    document.getElementById('btnAddProduct')?.click();
}

// ================================================================
// EXPORTAR
// ================================================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        abrirScannerBarras,
        fecharScanner,
        isCameraSupported: () => !!(navigator.mediaDevices?.getUserMedia),
        testarCodigoBarrasManual
    };
}

window.testarCodigoBarrasManual = testarCodigoBarrasManual;
window.abrirScannerBarras = abrirScannerBarras;
window.fecharScanner = fecharScanner;

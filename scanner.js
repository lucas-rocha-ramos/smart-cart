// ================================================================
// SCANNER.JS - Leitor de código de barras REAL (com QuaggaJS)
// ================================================================

// ================================================================
// CARREGAR QUAGGAJS (Biblioteca de leitura real)
// ================================================================

// Carrega a biblioteca QuaggaJS via CDN
const scriptQuagga = document.createElement('script');
scriptQuagga.src = 'https://cdn.jsdelivr.net/npm/quagga@0.12.1/dist/quagga.min.js';
scriptQuagga.async = true;
document.head.appendChild(scriptQuagga);

// ================================================================
// VARIÁVEIS GLOBAIS
// ================================================================

let scannerAtivo = false;
let scannerStream = null;
let scannerVideo = null;
let quaggaInicializado = false;
let ultimoCodigoLido = '';
let ultimaLeitura = 0;
let onBarcodeCallback = null;

// ================================================================
// FUNÇÃO PARA ABRIR O SCANNER (COM QUAGGAJS)
// ================================================================

async function abrirScannerBarras() {
    // Verifica se o navegador suporta câmera
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('❌ Seu dispositivo não suporta câmera.');
        return;
    }

    const input = document.getElementById('barcodeInput');
    if (!input) {
        alert('❌ Campo de entrada não encontrado.');
        return;
    }

    // Cria o modal do scanner
    const modal = criarModalScanner();

    try {
        // Verifica se o QuaggaJS foi carregado
        if (typeof Quagga === 'undefined') {
            // Aguarda o carregamento da biblioteca
            await new Promise((resolve) => {
                const checkQuagga = setInterval(() => {
                    if (typeof Quagga !== 'undefined') {
                        clearInterval(checkQuagga);
                        resolve();
                    }
                }, 100);
            });
        }

        // Inicializa o QuaggaJS
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

            console.log('✅ QuaggaJS iniciado com sucesso!');
            quaggaInicializado = true;

            // Inicia o Quagga
            Quagga.start();

            // Configura o callback para detecção de código
            Quagga.onDetected(function(result) {
                const code = result.codeResult.code;
                if (code) {
                    const agora = Date.now();
                    if (agora - ultimaLeitura > 500) {
                        ultimoCodigoLido = code;
                        ultimaLeitura = agora;
                        
                        console.log('📷 Código lido:', code);
                        
                        // Feedback visual
                        const modal = document.getElementById('scannerModal');
                        if (modal) {
                            const border = modal.querySelector('.scan-border');
                            if (border) {
                                border.style.borderColor = '#34a853';
                                border.style.boxShadow = '0 0 50px rgba(52,168,83,0.6)';
                                setTimeout(() => {
                                    border.style.borderColor = '#34a853';
                                    border.style.boxShadow = '0 0 30px rgba(52,168,83,0.3)';
                                }, 300);
                            }
                        }
                        
                        // Toca som de bip
                        tocarBipScanner();
                        
                        // Preenche o input e fecha
                        input.value = code;
                        setTimeout(() => {
                            fecharScanner();
                            document.getElementById('btnAddProduct')?.click();
                        }, 500);
                    }
                }
            });
        });

    } catch (error) {
        console.error('❌ Erro ao abrir scanner:', error);
        alert('❌ Não foi possível acessar a câmera. Verifique as permissões.');
        document.body.removeChild(modal);
    }
}

// ================================================================
// CRIA O MODAL DO SCANNER
// ================================================================

function criarModalScanner() {
    // Remove modal existente
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
        <div style="position:relative;width:100%;max-width:500px;background:#000;border-radius:16px;overflow:hidden;">
            <div id="scannerContainer" style="width:100%;height:auto;min-height:300px;background:#000;"></div>
            <div class="scan-border" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
                        width:75%;height:35%;border:3px solid #34a853;border-radius:12px;
                        box-shadow:0 0 30px rgba(52,168,83,0.3);pointer-events:none;
                        transition: all 0.3s ease;">
                <div style="position:absolute;top:-2px;left:-2px;width:20px;height:20px;border-top:4px solid #34a853;border-left:4px solid #34a853;border-radius:4px 0 0 0;"></div>
                <div style="position:absolute;top:-2px;right:-2px;width:20px;height:20px;border-top:4px solid #34a853;border-right:4px solid #34a853;border-radius:0 4px 0 0;"></div>
                <div style="position:absolute;bottom:-2px;left:-2px;width:20px;height:20px;border-bottom:4px solid #34a853;border-left:4px solid #34a853;border-radius:0 0 0 4px;"></div>
                <div style="position:absolute;bottom:-2px;right:-2px;width:20px;height:20px;border-bottom:4px solid #34a853;border-right:4px solid #34a853;border-radius:0 0 4px 0;"></div>
            </div>
            <div id="scannerStatus" style="position:absolute;bottom:20px;left:50%;transform:translateX(-50%);
                        color:white;font-size:14px;background:rgba(0,0,0,0.7);padding:8px 16px;border-radius:8px;
                        font-family:'Inter',sans-serif;text-align:center;min-width:200px;">
                📷 Posicione o código de barras no centro
            </div>
        </div>
        <button onclick="fecharScanner()" style="margin-top:20px;background:#ea4335;color:white;border:none;
                padding:12px 32px;border-radius:50px;font-size:16px;font-weight:600;cursor:pointer;
                font-family:'Inter',sans-serif;">
            <i class="fas fa-times"></i> Fechar
        </button>
    `;

    document.body.appendChild(modal);
    return modal;
}

// ================================================================
// SINAL SONORO PARA LEITURA
// ================================================================

function tocarBipScanner() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;
        
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
        }, 150);
    } catch (e) {
        // Fallback: beep silencioso
    }
}

// ================================================================
// FECHA O SCANNER
// ================================================================

function fecharScanner() {
    scannerAtivo = false;
    
    // Para o Quagga
    if (quaggaInicializado && typeof Quagga !== 'undefined') {
        try {
            Quagga.stop();
            quaggaInicializado = false;
        } catch (e) {}
    }
    
    // Para a stream da câmera
    if (scannerStream) {
        scannerStream.getTracks().forEach(track => track.stop());
        scannerStream = null;
    }
    
    if (scannerVideo) {
        scannerVideo.srcObject = null;
        scannerVideo = null;
    }
    
    // Remove o modal
    const modal = document.getElementById('scannerModal');
    if (modal) {
        document.body.removeChild(modal);
    }
    
    // Resetar o botão
    const btn = document.getElementById('btnScanBarcode');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-camera"></i> Escanear código';
        btn.style.background = '';
        btn.disabled = false;
    }
    
    // Remove a div do Quagga
    const container = document.getElementById('scannerContainer');
    if (container) {
        container.innerHTML = '';
    }
}

// ================================================================
// VERIFICA SUPORTE A CÂMERA
// ================================================================

function isCameraSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// ================================================================
// FUNÇÃO MANUAL PARA TESTE (SEM CÂMERA)
// ================================================================

function testarCodigoBarrasManual(codigo) {
    const input = document.getElementById('barcodeInput');
    if (!input) {
        alert('Campo de entrada não encontrado.');
        return;
    }
    
    if (!codigo || codigo.length < 8) {
        alert('Digite um código de barras válido (mínimo 8 caracteres).');
        return;
    }
    
    input.value = codigo;
    document.getElementById('btnAddProduct')?.click();
}

// ================================================================
// EXPORTAR FUNÇÕES
// ================================================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        abrirScannerBarras,
        fecharScanner,
        isCameraSupported,
        testarCodigoBarrasManual
    };
}

// ================================================================
// EXPORTA PARA O CONSOLE (DEBUG)
// ================================================================

window.testarCodigoBarrasManual = testarCodigoBarrasManual;
window.abrirScannerBarras = abrirScannerBarras;
window.fecharScanner = fecharScanner;

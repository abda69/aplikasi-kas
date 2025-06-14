// kas-harian-script.js (VERSI FINAL DENGAN KONFIGURASI)

// LANGKAH 1: Impor modul Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, onSnapshot, doc, getDoc, setDoc, getDocs, orderBy, serverTimestamp, deleteDoc, writeBatch, where, runTransaction } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// LANGKAH 2: Konfigurasi Firebase Anda
const firebaseConfig = {
  apiKey: "AIzaSyAM__kNuObKNb1NdOPv_Arz_Db7t2C7lMI",
  authDomain: "patty-cash-c6820.firebaseapp.com",
  projectId: "patty-cash-c6820",
  storageBucket: "patty-cash-c6820.appspot.com",
  messagingSenderId: "773824388873",
  appId: "1:773824388873:web:06ffb0b629fe7cbcde7dd8",
  measurementId: "G-80ZV2ZNY8D"
};

// LANGKAH 3: Inisialisasi Firebase di sini, di luar event listener
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'kas-harian-blogger'; // ID ini JANGAN diubah

// LANGKAH 4: Tunggu HTML siap, baru jalankan sisa kode aplikasi
document.addEventListener('DOMContentLoaded', function() {

    // Semua kode logika aplikasi Anda dimulai dari sini
    // (Tanpa perlu deklarasi firebaseConfig, app, auth, atau db lagi)

    let userId = null;
    let transactions = [];
    let unsubscribeTransactions = null;
    let currentReportDate = new Date().toISOString().slice(0, 10);
    let editingTransactionId = null;
    let selectedGroup = "";

    // UI Elements
    const groupNameSelect = document.getElementById('groupNameSelect');
    const reportDateInput = document.getElementById('reportDateInput');
    const companyNameElement = document.getElementById('companyName');
    const periodElement = document.getElementById('period');
    
    const saldoAwalInput = document.getElementById('saldoAwalInput');
    const kasCadanganInput = document.getElementById('kasCadanganInput'); 
    const pendinganTunaiInput = document.getElementById('pendinganTunaiInput');
    const pendinganOperasionalInput = document.getElementById('pendinganOperasionalInput');
    const pendinganOnderdilInput = document.getElementById('pendinganOnderdilInput'); 
    const pendinganUmumInput = document.getElementById('pendinganUmumInput');
    const pendinganKantorInput = document.getElementById('pendinganKantorInput');
    
    const transactionDateInput = document.getElementById('transactionDateInput');
    const voucherTypeSelect = document.getElementById('voucherTypeSelect');
    const voucherNumberDisplay = document.getElementById('voucherNumberDisplay'); 
    const descriptionInput = document.getElementById('descriptionInput');
    const totalKasInput = document.getElementById('totalKasInput');
    const accountCategorySelect = document.getElementById('accountCategorySelect');
    const addTransactionButton = document.getElementById('addTransactionButton');
    const cancelEditButton = document.getElementById('cancelEditButton');
    
    const transactionsTableBody = document.getElementById('transactionsTableBody');
    const transactionsTableFooter = document.getElementById('transactionsTableFooter'); 
    
    const totalKasSumCellInTotalRow = document.getElementById('totalKasSumCellInTotalRow'); 
    const totalLabelCellInTotalRow = document.getElementById('totalLabelCellInTotalRow');
    const tunaiSumElement = document.getElementById('tunaiSum');
    const operasionalSumElement = document.getElementById('operasionalSum');
    const onderdilSumElement = document.getElementById('onderdilSum'); 
    const umumSumElement = document.getElementById('umumSum');
    const kantorSumElement = document.getElementById('kantorSum');

    const combinedImpresLabelCell = document.getElementById('combinedImpresLabel');
    const combinedImpresValueCell = document.getElementById('combinedImpresValue');
    const combinedReimburseLabelCell = document.getElementById('combinedReimburseLabel');
    const combinedReimburseValueCell = document.getElementById('combinedReimburseValue');
    
    const grandTotalLabelCell = document.getElementById('grandTotalLabel');
    const grandTotalValueCell = document.getElementById('grandTotalValue');

    const selisihFooterLabelCell = document.getElementById('selisihFooterLabel');
    const selisihFooterValueCell = document.getElementById('selisihFooterValue');

    const downloadPdfButton = document.getElementById('downloadPdfButton');
    const downloadExcelButton = document.getElementById('downloadExcelButton');
    const copyTableButton = document.getElementById('copyTableButton'); 
    const deleteAllTransactionsButton = document.getElementById('deleteAllTransactionsButton');
    const statusMessageElement = document.getElementById('statusMessage');
    const loadingIndicator = document.getElementById('loadingIndicator');

    const groupNames = ["PARNO", "HARIANTO", "PUJI", "CLARISA SN", "ALFAN", "SINGGIH", "EDI", "SONY", "LUTFUL", "YULI", "BINTORO"];

    // --- Utility Functions ---
    function showLoading(show, message = "Memproses...") { 
        if(loadingIndicator) {
            loadingIndicator.classList.toggle('hidden', !show);
            const loadingMessage = loadingIndicator.querySelector('span');
            if (loadingMessage) loadingMessage.textContent = message;
        }
    }
    function showStatus(message, type = 'info') {
        if (!statusMessageElement) return;
        statusMessageElement.textContent = message;
        statusMessageElement.className = 'my-2 p-2 text-sm rounded text-center no-print'; 
        if (type === 'success') statusMessageElement.classList.add('bg-green-100', 'text-green-700');
        else if (type === 'error') statusMessageElement.classList.add('bg-red-100', 'text-red-700');
        else statusMessageElement.classList.add('bg-blue-100', 'text-blue-700');
        setTimeout(() => { statusMessageElement.textContent = ''; statusMessageElement.className = 'my-2 p-2 text-sm rounded text-center no-print';}, 5000);
    }
    
    function formatCurrency(value, isNegativeToDisplay) {
        const numValue = parseFloat(value) || 0;
        const absValue = Math.abs(numValue);
        const formatted = absValue.toLocaleString('id-ID');
        
        if (isNegativeToDisplay && numValue !== 0) { 
            return `(${formatted})`;
        }
        return formatted;
    }

    function formatDate(dateString) { 
        if (!dateString) return 'N/A';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }
    function getMonthYear(dateString) { 
        if (!dateString) return '';
        const [year, month] = dateString.split('-');
        return `${month}${year.slice(2)}`;
    }

    // --- Populate Group Name Dropdown ---
    function populateGroupNameDropdown() {
        if (!groupNameSelect) return;
        while (groupNameSelect.options.length > 1) { 
            groupNameSelect.remove(1);
        }
        if (groupNameSelect.options.length === 0 || groupNameSelect.options[0].value !== "") {
            const placeholderOption = document.createElement('option');
            placeholderOption.value = "";
            placeholderOption.text = "-- Pilih Kelompok --";
            placeholderOption.disabled = true; 
            placeholderOption.selected = true; 
            if (groupNameSelect.options.length > 0) { 
                groupNameSelect.insertBefore(placeholderOption, groupNameSelect.firstChild);
            } else {
                groupNameSelect.appendChild(placeholderOption);
            }
        }

        groupNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.text = name;
            groupNameSelect.appendChild(option);
        });
    }

    // --- Firebase Auth ---
    onAuthStateChanged(auth, async (user) => {
        showLoading(true);
        if (user) {
            userId = user.uid;
            populateGroupNameDropdown(); 
            await loadLastSelectedGroup(); 
        } else {
            try {
                await signInAnonymously(auth);
            } catch (error) { console.error("Auth Error: ", error); showStatus(`Error autentikasi: ${error.message}`, "error"); showLoading(false); }
        }
    });

    // --- Group Name Handling ---
    async function loadLastSelectedGroup() { 
        if (!userId || !groupNameSelect || !companyNameElement) return;
        const settingsDocRef = doc(db, `artifacts/${appId}/users/${userId}/appSettings/companyProfile`);
        try {
            const docSnap = await getDoc(settingsDocRef);
            let lastSelected = ""; 
            if (docSnap.exists() && docSnap.data().lastSelectedGroup) { 
                lastSelected = docSnap.data().lastSelectedGroup;
            }
            
            let optionExists = false;
            for (let i = 0; i < groupNameSelect.options.length; i++) {
                if (groupNameSelect.options[i].value === lastSelected) {
                    optionExists = true;
                    break;
                }
            }

            if (optionExists) {
                groupNameSelect.value = lastSelected;
                selectedGroup = lastSelected; 
                companyNameElement.textContent = lastSelected.toUpperCase();
            } else {
                 groupNameSelect.value = ""; 
                 selectedGroup = "";
                 companyNameElement.textContent = "NAMA KELOMPOK"; 
            }
        } catch (error) {
            console.error("Error loading last selected group:", error);
            groupNameSelect.value = ""; 
            selectedGroup = "";
            companyNameElement.textContent = "NAMA KELOMPOK";
        } finally {
            if (selectedGroup) { 
               initializeReportDate(); 
               showStatus("Autentikasi berhasil.", "success"); 
            } else {
                showStatus("Pilih kelompok untuk melanjutkan.", "info");
                showLoading(false); 
            }
        }
    }

    if (groupNameSelect) {
        groupNameSelect.addEventListener('change', async (e) => {
            if (!userId || !companyNameElement) return;
            selectedGroup = e.target.value; 
            
            if (!selectedGroup) { 
                showStatus("Pilihan kelompok tidak valid.", "error");
                companyNameElement.textContent = "NAMA KELOMPOK"; 
                if(transactionsTableBody) transactionsTableBody.innerHTML = `<tr><td colspan="11" class="text-center p-3 border">Pilih kelompok untuk melihat data.</td></tr>`;
                return;
            }
            companyNameElement.textContent = selectedGroup.toUpperCase();
            
            const settingsDocRef = doc(db, `artifacts/${appId}/users/${userId}/appSettings/companyProfile`);
            try {
                await setDoc(settingsDocRef, { lastSelectedGroup: selectedGroup }, { merge: true }); 
                showStatus(`Kelompok ${selectedGroup} dipilih.`, "success");
                initializeReportDate(); 
            } catch (error) {
                console.error("Error saving selected group:", error);
                showStatus("Gagal menyimpan pilihan kelompok.", "error");
            }
        });
    }
    
    // --- Report Date and Opening Balances Handling ---
    function initializeReportDate() {
        if (!selectedGroup) { 
            showLoading(false);
            return;
        }
        if (reportDateInput) reportDateInput.value = currentReportDate;
        if (transactionDateInput) transactionDateInput.value = currentReportDate; 
        updatePeriodDisplay();
        loadOpeningBalances(); 
        loadTransactions(); 
    }

    if (reportDateInput) {
        reportDateInput.addEventListener('change', (e) => {
            currentReportDate = e.target.value;
            if (transactionDateInput) transactionDateInput.value = currentReportDate; 
            updatePeriodDisplay();
            if (selectedGroup) { 
                loadOpeningBalances(); 
                loadTransactions();
            }
            resetForm(); 
        });
    }
    
    if (voucherTypeSelect) {
        voucherTypeSelect.addEventListener('change', updateVoucherNumberDisplay);
    }
    
    if (transactionDateInput) {
        transactionDateInput.addEventListener('change', updateVoucherNumberDisplay);
    }

    async function saveOpeningBalances(changedField = null) {
        if (!userId || !currentReportDate || !selectedGroup) return;
    
        const reportDocRef = doc(db, `artifacts/${appId}/users/${userId}/groupData/${selectedGroup}/dailyCashReports/${currentReportDate}`);
        let currentData = {};
        try {
            const docSnap = await getDoc(reportDocRef);
            if (docSnap.exists()) {
                currentData = docSnap.data();
            }
        } catch (e) { console.error("Error fetching current data for save:", e); }
    
        const dataToSave = {
            saldoAwal: parseFloat(saldoAwalInput.value) || 0,
            kasCadangan: parseFloat(kasCadanganInput.value) || 0,
            pendinganTunai: parseFloat(pendinganTunaiInput.value) || 0,
            pendinganOperasional: parseFloat(pendinganOperasionalInput.value) || 0,
            pendinganOnderdil: parseFloat(pendinganOnderdilInput.value) || 0,
            pendinganUmum: parseFloat(pendinganUmumInput.value) || 0,
            pendinganKantor: parseFloat(pendinganKantorInput.value) || 0,
            
            saldoAwalManuallySet: (changedField === 'saldoAwal') ? true : (currentData.saldoAwalManuallySet || false),
            kasCadanganManuallySet: (changedField === 'kasCadangan') ? true : (currentData.kasCadanganManuallySet || false),
            pendinganTunaiManuallySet: (changedField === 'pendinganTunai') ? true : (currentData.pendinganTunaiManuallySet || false),
            pendinganOperasionalManuallySet: (changedField === 'pendinganOperasional') ? true : (currentData.pendinganOperasionalManuallySet || false),
            pendinganOnderdilManuallySet: (changedField === 'pendinganOnderdil') ? true : (currentData.pendinganOnderdilManuallySet || false),
            pendinganUmumManuallySet: (changedField === 'pendinganUmum') ? true : (currentData.pendinganUmumManuallySet || false),
            pendinganKantorManuallySet: (changedField === 'pendinganKantor') ? true : (currentData.pendinganKantorManuallySet || false),
        };
    
        showLoading(true);
        try {
            await setDoc(reportDocRef, dataToSave, { merge: true });
            if (changedField) showStatus("Data awal berhasil disimpan.", "success");
            else console.log("Opening balances (possibly carried over) saved for " + currentReportDate + " in group " + selectedGroup);
            renderReport(); 
        } catch (error) { 
            console.error("Error saving opening balances: ", error); 
            showStatus("Gagal menyimpan data awal.", "error");
        } finally { 
            showLoading(false); 
        }
    }

    if (saldoAwalInput) saldoAwalInput.addEventListener('change', () => saveOpeningBalances('saldoAwal'));
    if (kasCadanganInput) kasCadanganInput.addEventListener('change', () => saveOpeningBalances('kasCadangan'));
    if (pendinganTunaiInput) pendinganTunaiInput.addEventListener('change', () => saveOpeningBalances('pendinganTunai'));
    if (pendinganOperasionalInput) pendinganOperasionalInput.addEventListener('change', () => saveOpeningBalances('pendinganOperasional'));
    if (pendinganOnderdilInput) pendinganOnderdilInput.addEventListener('change', () => saveOpeningBalances('pendinganOnderdil'));
    if (pendinganUmumInput) pendinganUmumInput.addEventListener('change', () => saveOpeningBalances('pendinganUmum'));
    if (pendinganKantorInput) pendinganKantorInput.addEventListener('change', () => saveOpeningBalances('pendinganKantor'));


    async function loadOpeningBalances() {
        const inputs = { saldoAwal: saldoAwalInput, kasCadangan: kasCadanganInput, pendinganTunai: pendinganTunaiInput, pendinganOperasional: pendinganOperasionalInput, pendinganOnderdil: pendinganOnderdilInput, pendinganUmum: pendinganUmumInput, pendinganKantor: pendinganKantorInput };
        if (!userId || !currentReportDate || !selectedGroup || Object.values(inputs).some(input => !input)) { 
            Object.values(inputs).forEach(input => { if(input) input.value = 0; });
            renderReport(); return; 
        }
        showLoading(true);
        let needsSaveForDefaultsOrCarryOver = false;

        let dataForToday = {
            saldoAwal: 0, kasCadangan: 0, pendinganTunai: 0, pendinganOperasional: 0, pendinganOnderdil: 0, pendinganUmum: 0, pendinganKantor: 0,
            saldoAwalManuallySet: false, kasCadanganManuallySet: false, 
            pendinganTunaiManuallySet: false, pendinganOperasionalManuallySet: false, pendinganOnderdilManuallySet: false, pendinganUmumManuallySet: false, pendinganKantorManuallySet: false
        };

        try {
            const reportDocRef = doc(db, `artifacts/${appId}/users/${userId}/groupData/${selectedGroup}/dailyCashReports/${currentReportDate}`);
            const docSnap = await getDoc(reportDocRef);

            if (docSnap.exists()) {
                const savedData = docSnap.data();
                Object.keys(dataForToday).forEach(key => {
                    if (savedData[key] !== undefined) {
                        dataForToday[key] = savedData[key];
                    }
                });
            } else {
                needsSaveForDefaultsOrCarryOver = true; 
            }

            const dateObj = new Date(currentReportDate + 'T00:00:00Z'); 
            dateObj.setUTCDate(dateObj.getUTCDate() - 1);
            const previousDayDate = dateObj.toISOString().slice(0, 10);
            const prevDayDocRef = doc(db, `artifacts/${appId}/users/${userId}/groupData/${selectedGroup}/dailyCashReports/${previousDayDate}`);
            const prevDayDocSnap = await getDoc(prevDayDocRef);

            if (prevDayDocSnap.exists()) {
                const prevDayData = prevDayDocSnap.data();
                if (!dataForToday.saldoAwalManuallySet) {
                    dataForToday.saldoAwal = prevDayData.saldoAwal !== undefined ? prevDayData.saldoAwal : 0; 
                    dataForToday.saldoAwalManuallySet = false; 
                    needsSaveForDefaultsOrCarryOver = true;
                }
                if (!dataForToday.kasCadanganManuallySet) {
                    dataForToday.kasCadangan = prevDayData.kasCadangan !== undefined ? prevDayData.kasCadangan : 0; 
                    dataForToday.kasCadanganManuallySet = false; 
                    needsSaveForDefaultsOrCarryOver = true;
                }
                
                const pendinganFields = ['pendinganTunai', 'pendinganOperasional', 'pendinganOnderdil', 'pendinganUmum', 'pendinganKantor'];
                const sumFields = ['sumTunaiFinal', 'sumOperasionalFinal', 'sumOnderdilFinal', 'sumUmumFinal', 'sumKantorFinal'];
                let anyPendinganCarried = false;
                pendinganFields.forEach((field, index) => {
                    if (!dataForToday[`${field}ManuallySet`]) { 
                        dataForToday[field] = prevDayData[sumFields[index]] !== undefined ? prevDayData[sumFields[index]] : 0;
                        dataForToday[`${field}ManuallySet`] = false; 
                        anyPendinganCarried = true;
                    }
                });
                if(anyPendinganCarried) needsSaveForDefaultsOrCarryOver = true;

            } else { 
                if (!docSnap.exists()) { 
                   Object.keys(dataForToday).filter(k => k.endsWith('ManuallySet')).forEach(k => dataForToday[k] = false);
                }
            }
            
            saldoAwalInput.value = dataForToday.saldoAwal;
            kasCadanganInput.value = dataForToday.kasCadangan;
            pendinganTunaiInput.value = dataForToday.pendinganTunai;
            pendinganOperasionalInput.value = dataForToday.pendinganOperasional;
            pendinganOnderdilInput.value = dataForToday.pendinganOnderdil;
            pendinganUmumInput.value = dataForToday.pendinganUmum;
            pendinganKantorInput.value = dataForToday.pendinganKantor;

            if (needsSaveForDefaultsOrCarryOver) {
                const reportDocRefForSave = doc(db, `artifacts/${appId}/users/${userId}/groupData/${selectedGroup}/dailyCashReports/${currentReportDate}`);
                await setDoc(reportDocRefForSave, dataForToday, { merge: true }); 
                console.log("Initial/carried-over opening balances saved for " + currentReportDate + " in group " + selectedGroup);
            }

        } catch (error) { 
            console.error("Error loading/carrying over opening balances: ", error); 
            Object.values(inputs).forEach(input => {if(input) input.value = 0;});
        } finally { 
            renderReport(); 
            showLoading(false); 
        }
    }
    
    function updatePeriodDisplay() {
        if (!periodElement) return;
        const date = new Date(currentReportDate + 'T00:00:00'); 
        const options = { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' };
        periodElement.textContent = `PERIODE : ${date.toLocaleDateString('id-ID', options).toUpperCase()}`;
    }

    // --- Automatic Voucher Number ---
    async function updateVoucherNumberDisplay() {
        const currentTransactionDate = transactionDateInput ? transactionDateInput.value : currentReportDate;
        if (!userId || !selectedGroup || !currentTransactionDate || !voucherNumberDisplay || !voucherTypeSelect) {
            return;
        }

        showLoading(true, "Mendapatkan No Voucher...");
        const voucherType = voucherTypeSelect.value;
        const yearMonth = currentTransactionDate.slice(0, 7); // Format: "YYYY-MM"
        const counterDocRef = doc(db, `artifacts/${appId}/users/${userId}/groupData/${selectedGroup}/voucherCounters/${yearMonth}`);
        
        let nextSeq = 1;
        try {
            const counterDoc = await getDoc(counterDocRef);
            if (counterDoc.exists()) {
                const currentSeq = counterDoc.data()[voucherType] || 0;
                nextSeq = currentSeq + 1;
            }
        } catch (error) {
            console.error("Error reading voucher counter for display:", error);
            showStatus("Gagal membaca nomor voucher terakhir.", "error");
        } finally {
            const targetVoucherMonthYearForDisplay = getMonthYear(currentTransactionDate); // e.g., "0625"
            const formattedSeq = String(nextSeq).padStart(3, '0');
            voucherNumberDisplay.textContent = `${voucherType}-${targetVoucherMonthYearForDisplay}-${formattedSeq}`;
            showLoading(false);
        }
    }


    // --- Transaction Handling ---
    if (addTransactionButton) {
        addTransactionButton.addEventListener('click', async () => {
            if (!userId || !currentReportDate || !selectedGroup || !transactionDateInput || !voucherTypeSelect || !descriptionInput || !totalKasInput || !accountCategorySelect) { 
                showStatus("Pilih kelompok & tanggal laporan, atau elemen form tidak ditemukan.", "error"); return; 
            }

            const tgl = transactionDateInput.value;
            const tipe = voucherTypeSelect.value;
            const keterangan = descriptionInput.value.trim();
            const totalKas = parseFloat(totalKasInput.value) || 0; 
            const kategori = accountCategorySelect.value;

            if (!tgl || !keterangan || totalKas <= 0 || !kategori) {
                showStatus("Isi semua field transaksi dengan benar.", "error"); return;
            }
            
            showLoading(true, "Menyimpan Transaksi...");
            
            try {
                // For updates, just overwrite the data without changing the voucher number
                if (editingTransactionId) {
                    const txDocRef = doc(db, `artifacts/${appId}/users/${userId}/groupData/${selectedGroup}/dailyCashReports/${currentReportDate}/transactions/${editingTransactionId}`);
                    const originalTxSnap = await getDoc(txDocRef);
                    if (originalTxSnap.exists()) {
                        const originalTx = originalTxSnap.data();
                        const transactionData = {
                            ...originalTx, // Preserve original data
                            reportDate: currentReportDate, 
                            transactionDate: tgl,
                            voucherType: tipe, 
                            description: keterangan,
                            totalKas: totalKas, 
                            category: kategori,
                            updatedAt: serverTimestamp()
                        };
                        await setDoc(txDocRef, transactionData);
                        showStatus("Transaksi berhasil diperbarui.", "success");
                    } else {
                        throw new Error("Dokumen asli untuk diedit tidak ditemukan.");
                    }
                } else {
                    // For new transactions, generate a new voucher number
                    const yearMonth = tgl.slice(0, 7); // "YYYY-MM"
                    const counterDocRef = doc(db, `artifacts/${appId}/users/${userId}/groupData/${selectedGroup}/voucherCounters/${yearMonth}`);
                    
                    await runTransaction(db, async (transaction) => {
                        const counterDoc = await transaction.get(counterDocRef);
                        let currentSeq = 0;
                        if (counterDoc.exists()) {
                            currentSeq = counterDoc.data()[tipe] || 0;
                        }
                        const finalSequenceNumber = currentSeq + 1;
                        const newData = {};
                        newData[tipe] = finalSequenceNumber;
                        transaction.set(counterDocRef, newData, { merge: true });

                        const formattedSeq = String(finalSequenceNumber).padStart(3, '0');
                        const voucherMonthYearForNumber = getMonthYear(tgl); // e.g., "0625"
                        const finalVoucherNumber = `${tipe}-${voucherMonthYearForNumber}-${formattedSeq}`;
                        
                        const transactionData = {
                            reportDate: currentReportDate, 
                            transactionDate: tgl,
                            voucherType: tipe, 
                            voucherNumberSequence: formattedSeq, 
                            noVoucher: finalVoucherNumber, 
                            description: keterangan,
                            totalKas: totalKas, 
                            category: kategori,
                            voucherMonthYear: voucherMonthYearForNumber,
                            createdAt: serverTimestamp()
                        };
                        const newTxRef = doc(collection(db, `artifacts/${appId}/users/${userId}/groupData/${selectedGroup}/dailyCashReports/${currentReportDate}/transactions`));
                        transaction.set(newTxRef, transactionData);
                    });
                    showStatus("Transaksi berhasil ditambahkan.", "success");
                }
                
                resetForm();
                await updateVoucherNumberDisplay();

            } catch (error) {
                console.error("Gagal menyimpan transaksi: ", error);
                showStatus("Gagal menyimpan: " + error.message, "error");
            } finally {
                showLoading(false);
            }
        });
    }

    function resetForm() {
        editingTransactionId = null;
        if (descriptionInput) descriptionInput.value = '';
        if (totalKasInput) totalKasInput.value = '';
        if (accountCategorySelect) accountCategorySelect.value = 'TUNAI'; 
        if (addTransactionButton) {
            addTransactionButton.textContent = 'Tambah Transaksi';
            addTransactionButton.classList.remove('bg-yellow-500', 'hover:bg-yellow-600', 'text-black');
            addTransactionButton.classList.add('bg-green-500', 'hover:bg-green-600', 'text-white');
        }
        if (cancelEditButton) cancelEditButton.classList.add('hidden');
        if (selectedGroup) updateVoucherNumberDisplay(); 
    }
    if (cancelEditButton) cancelEditButton.addEventListener('click', resetForm);


    function populateFormForEdit(transaction) {
        editingTransactionId = transaction.id;
        if (transactionDateInput) transactionDateInput.value = transaction.transactionDate;
        if (voucherTypeSelect) voucherTypeSelect.value = transaction.voucherType;
        if (voucherNumberDisplay) voucherNumberDisplay.textContent = transaction.noVoucher; 
        if (descriptionInput) descriptionInput.value = transaction.description;
        if (totalKasInput) totalKasInput.value = transaction.totalKas; 
        if (accountCategorySelect) accountCategorySelect.value = transaction.category;

        if (addTransactionButton) {
            addTransactionButton.textContent = 'Update Transaksi';
            addTransactionButton.classList.remove('bg-green-500', 'hover:bg-green-600', 'text-white');
            addTransactionButton.classList.add('bg-yellow-500', 'hover:bg-yellow-600', 'text-black');
        }
        if (cancelEditButton) cancelEditButton.classList.remove('hidden');
        const inputSectionElement = document.getElementById('inputSection');
        if(inputSectionElement) window.scrollTo({ top: inputSectionElement.offsetTop, behavior: 'smooth' });
    }


    function loadTransactions() {
        if (unsubscribeTransactions) unsubscribeTransactions(); 
        if (!userId || !currentReportDate || !selectedGroup || !transactionsTableBody) { 
            transactions = []; 
            renderReport(); 
            showLoading(false); 
            return; 
        }
        
        showLoading(true);
        const transactionsColRef = collection(db, `artifacts/${appId}/users/${userId}/groupData/${selectedGroup}/dailyCashReports/${currentReportDate}/transactions`);
        const q = query(transactionsColRef, orderBy("createdAt", "asc")); 

        unsubscribeTransactions = onSnapshot(q, async (querySnapshot) => {
            transactions = [];
            querySnapshot.forEach((doc) => { transactions.push({ id: doc.id, ...doc.data() }); });
            await renderReport(); 
            if (!editingTransactionId) { 
               await updateVoucherNumberDisplay();
            }
            showLoading(false);
        }, (error) => {
            console.error("Error loading transactions: ", error); showStatus("Gagal memuat transaksi.", "error");
            transactions = []; renderReport(); showLoading(false); 
        });
    }
    
    async function saveReportSummaryData(summaryData) {
        if (!userId || !currentReportDate || !selectedGroup) return;
        const reportDocRef = doc(db, `artifacts/${appId}/users/${userId}/groupData/${selectedGroup}/dailyCashReports/${currentReportDate}`);
        try {
            const numericSummaryData = {};
            for (const key in summaryData) {
                numericSummaryData[key] = parseFloat(summaryData[key]) || 0; 
            }
            numericSummaryData.saldoAwal = parseFloat(saldoAwalInput.value) || 0;
            numericSummaryData.kasCadangan = parseFloat(kasCadanganInput.value) || 0;
            
            await setDoc(reportDocRef, numericSummaryData, { merge: true });
            console.log("Report summary data saved for " + currentReportDate + " in group " + selectedGroup);
        } catch (error) {
            console.error("Error saving report summary data: ", error);
        }
    }

    // --- Rendering Report ---
    async function renderReport() { 
         if (!transactionsTableBody || !saldoAwalInput || !kasCadanganInput || 
            !pendinganTunaiInput || !pendinganOperasionalInput || !pendinganOnderdilInput || !pendinganUmumInput || !pendinganKantorInput ||
            !totalKasSumCellInTotalRow || !totalLabelCellInTotalRow ||
            !tunaiSumElement || !operasionalSumElement || !onderdilSumElement || !umumSumElement || !kantorSumElement ||
            !combinedImpresLabelCell || !combinedImpresValueCell || !combinedReimburseLabelCell || !combinedReimburseValueCell || 
            !grandTotalLabelCell || !grandTotalValueCell || 
            !selisihFooterLabelCell || !selisihFooterValueCell ) { 
            console.error("One or more UI elements for rendering report are missing.");
            return;
        }
        if (!selectedGroup && transactionsTableBody) {
            transactionsTableBody.innerHTML = `<tr><td colspan="11" class="text-center p-3 border">Silakan pilih kelompok terlebih dahulu.</td></tr>`;
            totalKasSumCellInTotalRow.textContent = '-'; 
            tunaiSumElement.textContent = '0'; operasionalSumElement.textContent = '0';
            onderdilSumElement.textContent = '0'; umumSumElement.textContent = '0'; kantorSumElement.textContent = '0';
            if(combinedImpresValueCell) combinedImpresValueCell.textContent = '0'; 
            if(combinedReimburseValueCell) combinedReimburseValueCell.textContent = '0'; 
            if(grandTotalValueCell) grandTotalValueCell.textContent = '0';
            if(selisihFooterValueCell) selisihFooterValueCell.textContent = '0';
            return;
        }

        transactionsTableBody.innerHTML = ''; 
        let rowCounter = 1; 
        
        const mainSaldoAwal = parseFloat(saldoAwalInput.value) || 0;
        const valKasCadangan = parseFloat(kasCadanganInput.value) || 0;
        const valPendinganTunai = parseFloat(pendinganTunaiInput.value) || 0;
        const valPendinganOperasional = parseFloat(pendinganOperasionalInput.value) || 0;
        const valPendinganOnderdil = parseFloat(pendinganOnderdilInput.value) || 0;
        const valPendinganUmum = parseFloat(pendinganUmumInput.value) || 0;
        const valPendinganKantor = parseFloat(pendinganKantorInput.value) || 0;
        const totalNilaiSemuaPendingan = valPendinganTunai + valPendinganOperasional + valPendinganOnderdil + valPendinganUmum + valPendinganKantor;

        let totalKasMasukForSummary = 0; 
        let totalKasKeluarForSummary = 0; 
        
        let algebraicSumTotalKas = 0;
        let algebraicSumTunai = 0;
        let algebraicSumOperasional = 0;
        let algebraicSumOnderdil = 0;
        let algebraicSumUmum = 0;
        let algebraicSumKantor = 0;

        let currentPeriodKK_Operasional = 0;
        let currentPeriodKK_Onderdil = 0;
        let currentPeriodKK_Umum = 0;
        let currentPeriodKK_Kantor = 0;

        const addSimpleFixedRow = (keterangan, totalKasValueForRow) => {
            const row = transactionsTableBody.insertRow();
            row.className = 'border-b bg-gray-50'; 
            row.insertCell().textContent = rowCounter++; 
            row.insertCell().textContent = formatDate(currentReportDate); 
            row.insertCell().textContent = "-"; 
            
            const totalKasCellFixed = row.insertCell(); 
            totalKasCellFixed.textContent = formatCurrency(totalKasValueForRow, false); 
            
            row.insertCell().textContent = keterangan; 
            
            row.insertCell().textContent = '-'; 
            row.insertCell().textContent = '-'; 
            row.insertCell().textContent = '-'; 
            row.insertCell().textContent = '-'; 
            row.insertCell().textContent = '-'; 
            
            const actionsCellFixed = row.insertCell(); 
            actionsCellFixed.classList.add('no-print');
            Array.from(row.cells).forEach((cell, index) => {
                cell.classList.add('px-2', 'py-1', 'border', 'border-gray-400');
                if (index <= 1 || index === 4 ) cell.classList.add('text-left'); 
                else if (index === 2 || index === 3 || (index >= 5 && index <=9)) cell.classList.add('text-right'); 
            });
            algebraicSumTotalKas += totalKasValueForRow; 
        };
        
        addSimpleFixedRow("SALDO AWAL", mainSaldoAwal);
        addSimpleFixedRow("KAS CADANGAN", valKasCadangan);

        if (totalNilaiSemuaPendingan > 0) {
            const rowPendingan = transactionsTableBody.insertRow();
            rowPendingan.className = 'border-b bg-gray-50';
            rowPendingan.insertCell().textContent = rowCounter++; 
            rowPendingan.insertCell().textContent = formatDate(currentReportDate); 
            rowPendingan.insertCell().textContent = "-"; 
            
            const totalKasPendinganCell = rowPendingan.insertCell(); 
            totalKasPendinganCell.textContent = formatCurrency(totalNilaiSemuaPendingan, true); 
            totalKasPendinganCell.classList.add('text-red-600'); 

            rowPendingan.insertCell().textContent = "PENDINGAN PERIODE SEBELUMNYA"; 
            
            rowPendingan.insertCell().textContent = valPendinganTunai > 0 ? formatCurrency(valPendinganTunai, false) : '-';
            rowPendingan.insertCell().textContent = valPendinganOperasional > 0 ? formatCurrency(valPendinganOperasional, false) : '-';
            rowPendingan.insertCell().textContent = valPendinganOnderdil > 0 ? formatCurrency(valPendinganOnderdil, false) : '-';
            rowPendingan.insertCell().textContent = valPendinganUmum > 0 ? formatCurrency(valPendinganUmum, false) : '-';
            rowPendingan.insertCell().textContent = valPendinganKantor > 0 ? formatCurrency(valPendinganKantor, false) : '-';
            
            const actionsCellPendingan = rowPendingan.insertCell();
            actionsCellPendingan.classList.add('no-print');
             Array.from(rowPendingan.cells).forEach((cell, index) => {
                cell.classList.add('px-2', 'py-1', 'border', 'border-gray-400');
                 if (index <= 1 || index === 4 ) cell.classList.add('text-left'); 
                else if (index === 2 || index === 3 || (index >= 5 && index <=9)) cell.classList.add('text-right');
            });

            algebraicSumTotalKas -= totalNilaiSemuaPendingan; 
            algebraicSumTunai += valPendinganTunai;         
            algebraicSumOperasional += valPendinganOperasional;
            algebraicSumOnderdil += valPendinganOnderdil;
            algebraicSumUmum += valPendinganUmum;
            algebraicSumKantor += valPendinganKantor;
            totalKasKeluarForSummary += totalNilaiSemuaPendingan; 
        }

        transactions.forEach(tx => {
            const row = transactionsTableBody.insertRow();
            row.className = 'border-b hover:bg-gray-50'; 
            
            row.insertCell().textContent = rowCounter++; 
            row.insertCell().textContent = formatDate(tx.transactionDate); 
            row.insertCell().textContent = tx.noVoucher; 
            
            const totalKasCell = row.insertCell(); 
            let isTotalKasNegativeDisplay = tx.voucherType === 'KK'; 
            
            if (selectedGroup === "YULI" && tx.voucherType === 'KK' && tx.category !== 'TUNAI') {
                totalKasCell.textContent = '-';
            } else {
                totalKasCell.textContent = formatCurrency(tx.totalKas, isTotalKasNegativeDisplay);
                if (isTotalKasNegativeDisplay && tx.totalKas !== 0) totalKasCell.classList.add('text-red-600');
            }

            row.insertCell().textContent = tx.description; 
            
            const createCategoryCell = (categoryName) => {
                const cell = row.insertCell();
                if (tx.category === categoryName) {
                    const isCategoryNegativeDisplay = tx.voucherType === 'KM';
                    cell.textContent = formatCurrency(tx.totalKas, isCategoryNegativeDisplay);
                    if (isCategoryNegativeDisplay && tx.totalKas !== 0) cell.classList.add('text-red-600');
                } else {
                    cell.textContent = '-';
                }
                return cell;
            };
            createCategoryCell('TUNAI');
            createCategoryCell('OPERASIONAL');
            createCategoryCell('ONDERDIL'); 
            createCategoryCell('UMUM');
            createCategoryCell('KANTOR');
            
            const actionsCell = row.insertCell();
            actionsCell.classList.add('text-center', 'no-print'); 
            const editButton = document.createElement('button');
            editButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-600 hover:text-blue-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>`;
            editButton.classList.add('p-1', 'rounded', 'mr-1');
            editButton.title = "Edit Transaksi";
            editButton.onclick = () => populateFormForEdit(tx);
            actionsCell.appendChild(editButton);

            Array.from(row.cells).forEach((cell, index) => {
                cell.classList.add('px-2', 'py-1', 'border', 'border-gray-400');
                if (index <= 1 || index === 4 ) cell.classList.add('text-left'); 
                else if (index === 2 || index === 3 || (index >= 5 && index <=9)) cell.classList.add('text-right'); 
            });

            if (tx.voucherType === 'KM') {
                totalKasMasukForSummary += tx.totalKas;
                algebraicSumTotalKas += tx.totalKas; 
                if (tx.category === 'TUNAI') algebraicSumTunai -= tx.totalKas; 
                if (tx.category === 'OPERASIONAL') { algebraicSumOperasional -= tx.totalKas; }
                if (tx.category === 'ONDERDIL') { algebraicSumOnderdil -= tx.totalKas; }
                if (tx.category === 'UMUM') { algebraicSumUmum -= tx.totalKas; }
                if (tx.category === 'KANTOR') { algebraicSumKantor -= tx.totalKas; }
            } else if (tx.voucherType === 'KK') {
                if (!(selectedGroup === "YULI" && tx.category !== 'TUNAI')) {
                    totalKasKeluarForSummary += tx.totalKas;
                    algebraicSumTotalKas -= tx.totalKas; 
                }
                if (tx.category === 'TUNAI') { algebraicSumTunai += tx.totalKas; }
                if (tx.category === 'OPERASIONAL') {
                    algebraicSumOperasional += tx.totalKas;
                    currentPeriodKK_Operasional += tx.totalKas;
                }
                if (tx.category === 'ONDERDIL') {
                    algebraicSumOnderdil += tx.totalKas;
                    currentPeriodKK_Onderdil += tx.totalKas;
                }
                if (tx.category === 'UMUM') {
                    algebraicSumUmum += tx.totalKas;
                    currentPeriodKK_Umum += tx.totalKas;
                }
                if (tx.category === 'KANTOR') {
                    algebraicSumKantor += tx.totalKas;
                    currentPeriodKK_Kantor += tx.totalKas;
                }
            }
        });
        
         if (transactionsTableBody.rows.length === 0) { 
            transactionsTableBody.innerHTML = `<tr><td colspan="11" class="text-center p-3 border">Belum ada data.</td></tr>`; 
        }
        
        const updateFooterCell = (element, sum) => {
            if (!element) return; 
            const isNegative = sum < 0;
            element.textContent = formatCurrency(Math.abs(sum), isNegative); 
            element.classList.toggle('text-red-600', isNegative && sum !== 0);
        };
        
        let finalDisplayTunaiSum = algebraicSumTunai; 

        if (selectedGroup === "YULI") {
            const sumKategoriLainUntukYuli_KK_Only = currentPeriodKK_Operasional + currentPeriodKK_Onderdil + currentPeriodKK_Umum + currentPeriodKK_Kantor;
            finalDisplayTunaiSum = algebraicSumTunai - sumKategoriLainUntukYuli_KK_Only;
        }

        if (totalKasSumCellInTotalRow) totalKasSumCellInTotalRow.textContent = '-'; 
        if (totalLabelCellInTotalRow) totalLabelCellInTotalRow.textContent = 'TOTAL';
        updateFooterCell(tunaiSumElement, finalDisplayTunaiSum); 
        updateFooterCell(operasionalSumElement, algebraicSumOperasional);
        updateFooterCell(onderdilSumElement, algebraicSumOnderdil); 
        updateFooterCell(umumSumElement, algebraicSumUmum);
        updateFooterCell(kantorSumElement, algebraicSumKantor);

        const totalReimburseCalc = finalDisplayTunaiSum + 
                                   algebraicSumOperasional + 
                                   algebraicSumOnderdil + 
                                   algebraicSumUmum + 
                                   algebraicSumKantor;
        if (combinedImpresLabelCell) combinedImpresLabelCell.textContent = 'TOTAL KAS IMPRES';
        if (combinedImpresValueCell) updateFooterCell(combinedImpresValueCell, algebraicSumTotalKas);
        if (combinedReimburseLabelCell) combinedReimburseLabelCell.textContent = 'TOTAL REIMBURSE';
        if (combinedReimburseValueCell) updateFooterCell(combinedReimburseValueCell, totalReimburseCalc);
        
        const grandTotalCombined = algebraicSumTotalKas + totalReimburseCalc;
        if (grandTotalLabelCell) grandTotalLabelCell.textContent = 'TOTAL KAS IMPRES + TOTAL REIMBURSE';
        if (grandTotalValueCell) {
            updateFooterCell(grandTotalValueCell, grandTotalCombined);
        }

        const effectiveStartingBalanceForSummarySelisih = mainSaldoAwal + valKasCadangan;
        const selisihDiFooter = effectiveStartingBalanceForSummarySelisih - grandTotalCombined;
        if (selisihFooterLabelCell) selisihFooterLabelCell.textContent = 'SELISIH';
        if (selisihFooterValueCell) {
            updateFooterCell(selisihFooterValueCell, selisihDiFooter);
        }

        const saldoAkhirForSaving = (mainSaldoAwal + valKasCadangan) + totalKasMasukForSummary - totalKasKeluarForSummary;

        const reportSummaryData = {
            saldoAkhirKasFinal: saldoAkhirForSaving, 
            sumTunaiFinal: finalDisplayTunaiSum, 
            sumOperasionalFinal: algebraicSumOperasional,
            sumOnderdilFinal: algebraicSumOnderdil,
            sumUmumFinal: algebraicSumUmum,
            sumKantorFinal: algebraicSumKantor
        };
        await saveReportSummaryData(reportSummaryData);
    }

    // --- Control Buttons ---
    if (downloadPdfButton) {
        downloadPdfButton.addEventListener('click', async () => {
            if (!selectedGroup || !currentReportDate) {
                showStatus("Pilih kelompok dan tanggal laporan terlebih dahulu.", "info");
                return;
            }
            showLoading(true, "Membuat PDF...");
            const { jsPDF } = window.jspdf;
            const reportElement = document.querySelector('.report-container');
            
            const originalOverflow = reportElement.style.overflow;
            const originalHeight = reportElement.style.height;
            reportElement.style.overflow = 'visible';
            reportElement.style.height = 'auto';

            try {
                const canvas = await html2canvas(reportElement, { 
                    scale: 2, 
                    useCORS: true,
                    logging: false
                });
                
                reportElement.style.overflow = originalOverflow; 
                reportElement.style.height = originalHeight;

                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                    orientation: 'landscape', 
                    unit: 'pt', 
                    format: 'a4' 
                });

                const imgProps= pdf.getImageProperties(imgData);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                
                const imgWidth = imgProps.width;
                const imgHeight = imgProps.height;
                const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
                
                const newImgWidth = imgWidth * ratio;
                const newImgHeight = imgHeight * ratio;
                const x = (pdfWidth - newImgWidth) / 2;
                const y = (pdfHeight - newImgHeight) / 2;

                pdf.addImage(imgData, 'PNG', x, y, newImgWidth, newImgHeight);
                
                const fileName = `Laporan_Kas_${selectedGroup}_${currentReportDate.replace(/-/g, '')}.pdf`;
                pdf.save(fileName);
                showStatus("PDF berhasil diunduh.", "success");
            } catch (error) {
                console.error("Error generating PDF: ", error);
                showStatus("Gagal membuat PDF.", "error");
                 reportElement.style.overflow = originalOverflow; 
                 reportElement.style.height = originalHeight;
            } finally {
                showLoading(false);
            }
        });
    }

    function generateReportHTML() {
        let htmlContent = `
            <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: 'Arial', sans-serif; font-size: 9pt; }
                        table, th, td {
                            border: 1px solid black;
                            border-collapse: collapse;
                            white-space: nowrap;
                            padding: 3px 5px;
                            line-height: 1.4;
                        }
                        th {
                            background-color: #e0e0e0;
                            text-align: center;
                            font-weight: bold;
                        }
                        .keterangan-column { white-space: normal; width: 150px; }
                        .text-right { text-align: right; }
                        .text-left { text-align: left; }
                        .text-center { text-align: center; }
                        .font-bold { font-weight: bold; }
                    </style>
                </head>
                <body>
        `;

        const reportHeader = document.querySelector('.report-header');
        if (reportHeader) {
            htmlContent += reportHeader.innerHTML;
        }
        
        const table = document.querySelector('.report-container table');
        if(table){
            const clonedTable = table.cloneNode(true);
            clonedTable.querySelectorAll('.no-print').forEach(el => el.remove());
            htmlContent += clonedTable.outerHTML;
        }

        htmlContent += '</body></html>';
        return htmlContent;
    }
    
    if (downloadExcelButton) {
        downloadExcelButton.addEventListener('click', () => {
            if (!selectedGroup || !currentReportDate) {
                showStatus("Pilih kelompok dan tanggal laporan terlebih dahulu.", "info");
                return;
            }
            showLoading(true, "Membuat file Excel...");
            try {
                const htmlContent = generateReportHTML();
                const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' }); 
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                const fileName = `Laporan_Kas_${selectedGroup}_${currentReportDate.replace(/-/g, '')}.xls`;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href); 
                showStatus("File Excel berhasil diunduh.", "success");
            } catch(error) {
                console.error("Error generating Excel: ", error);
                showStatus("Gagal membuat file Excel.", "error");
            } finally {
                showLoading(false);
            }
        });
    }

    if (copyTableButton) {
        copyTableButton.addEventListener('click', () => {
             if (!selectedGroup || !currentReportDate) {
                showStatus("Pilih kelompok dan tanggal laporan terlebih dahulu.", "info");
                return;
            }
            try {
                const htmlContent = generateReportHTML();
                const newWindow = window.open('', '_blank');
                if (newWindow) {
                    newWindow.document.open();
                    newWindow.document.write('<html><head><title>Salin Laporan</title>');
                    newWindow.document.write(`<style>
                        body { font-family: 'Arial', sans-serif; font-size: 10pt; margin: 20px; }
                        table, th, td { border: 1px solid black; border-collapse: collapse; padding: 4px 6px; }
                        th { background-color: #e0e0e0; font-weight: bold; text-align: center; }
                        .keterangan-column { white-space: normal; width: 200px; }
                        .text-right { text-align: right; }
                        .text-left { text-align: left; }
                        .text-center { text-align: center; }
                        .font-bold { font-weight: bold; }
                    </style>`);
                    newWindow.document.write('</head><body>');
                    newWindow.document.write('<h3>Gunakan Ctrl+C untuk menyalin tabel di bawah ini, lalu tutup tab ini.</h3>');
                    const reportContainer = document.querySelector('.report-container');
                    if(reportContainer) {
                        const cleanReportContainer = reportContainer.cloneNode(true);
                        cleanReportContainer.querySelectorAll('.no-print').forEach(el => el.remove());
                        newWindow.document.write(cleanReportContainer.innerHTML);
                    }
                    newWindow.document.write('</body></html>');
                    newWindow.document.close();
                    showStatus("Tabel siap disalin di tab baru.", "success");
                } else {
                    throw new Error("Pop-up window was blocked.");
                }
            } catch (e) {
                showStatus("Gagal membuka tab baru. Mohon izinkan pop-up untuk situs ini.", "error");
                console.error("Copy to new tab error:", e);
            }
        });
    }

    if (deleteAllTransactionsButton) {
        deleteAllTransactionsButton.addEventListener('click', async () => {
            if (!userId || !currentReportDate || !selectedGroup) { 
                showStatus("Pilih kelompok dan tanggal laporan.", "error"); return; 
            }
            
            const modal = document.getElementById('confirmationModal');
            const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
            const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
            const confirmationText = document.getElementById('confirmationText');

            if (!modal || !confirmDeleteBtn || !cancelDeleteBtn || !confirmationText) {
                console.error("Confirmation modal elements not found.");
                if (confirm(`Anda yakin ingin menghapus SEMUA transaksi KM/KK untuk kelompok ${selectedGroup} pada tanggal ${formatDate(currentReportDate)}? Saldo Awal, Kas Cadangan, dan Pendingan tidak akan terhapus.`)) {
                     await performDeleteAllTransactions();
                }
                return;
            }
            
            confirmationText.textContent = `Anda yakin ingin menghapus SEMUA transaksi KM/KK untuk kelompok ${selectedGroup} pada tanggal ${formatDate(currentReportDate)}? Saldo Awal, Kas Cadangan, dan Pendingan tidak akan terhapus.`;
            modal.classList.remove('hidden');

            confirmDeleteBtn.onclick = async () => {
                modal.classList.add('hidden');
                await performDeleteAllTransactions();
            };
            cancelDeleteBtn.onclick = () => {
                modal.classList.add('hidden');
            };
        });
    }

    async function performDeleteAllTransactions() {
         showLoading(true);
        try {
            const transactionsColRef = collection(db, `artifacts/${appId}/users/${userId}/groupData/${selectedGroup}/dailyCashReports/${currentReportDate}/transactions`);
            const qSnapshot = await getDocs(transactionsColRef);
            const batch = writeBatch(db);
            qSnapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            showStatus(`Transaksi KM/KK untuk kelompok ${selectedGroup} pada tanggal ${formatDate(currentReportDate)} dihapus.`, "success");
        } catch (error) { console.error("Error deleting: ", error); showStatus("Gagal menghapus transaksi KM/KK.", "error");
        } finally { showLoading(false); }
    }

    if (companyNameElement) companyNameElement.textContent = "NAMA KELOMPOK"; 
    resetForm(); 

}); // <- Penutup untuk 'DOMContentLoaded'


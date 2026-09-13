// Lógica do Agendamento SAAS (com Suporte a Supabase & LocalStorage)

const defaultServices = [
  { id: 1, name: "Corte de Cabelo", price: 40.0, duration: 30 },
  { id: 2, name: "Barba & Bigode", price: 30.0, duration: 30 },
  { id: 3, name: "Combo Cabelo + Barba", price: 65.0, duration: 60 },
  { id: 4, name: "Design de Sobrancelhas", price: 20.0, duration: 20 }
];

const staffList = [
  { id: 1, name: "Atendente Principal" },
  { id: 2, name: "Profissional 2" },
  { id: 3, name: "Qualquer Profissional" }
];

const hoursSlots = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
];

let selectedService = null;
let selectedStaff = null;
let selectedSlot = null;

const dateInput = document.getElementById("booking-date");
const todayStr = new Date().toISOString().split("T")[0];
dateInput.min = todayStr;
dateInput.value = todayStr;

function renderServices() {
  const container = document.getElementById("services-container");
  const services = JSON.parse(localStorage.getItem("saas_services")) || defaultServices;
  
  container.innerHTML = services.map(s => `
    <div class="selectable-item ${selectedService?.id === s.id ? 'active' : ''}" onclick="selectService(${s.id})">
      <strong>${s.name}</strong>
      <div class="price">R$ ${Number(s.price).toFixed(2)}</div>
    </div>
  `).join("");
}

window.selectService = function(id) {
  const services = JSON.parse(localStorage.getItem("saas_services")) || defaultServices;
  selectedService = services.find(s => s.id === id);
  renderServices();
  updateTimeSlots();
};

function renderStaff() {
  const container = document.getElementById("staff-container");
  container.innerHTML = staffList.map(st => `
    <div class="selectable-item ${selectedStaff?.id === st.id ? 'active' : ''}" onclick="selectStaff(${st.id})">
      <strong>${st.name}</strong>
    </div>
  `).join("");
}

window.selectStaff = function(id) {
  selectedStaff = staffList.find(s => s.id === id);
  renderStaff();
  updateTimeSlots();
};

async function updateTimeSlots() {
  const container = document.getElementById("time-slots");
  const targetDate = dateInput.value;
  let bookedSlots = [];

  // Se o Supabase estiver conectado, busca horários ocupados no banco
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('agendamentos')
        .select('horario, profissional')
        .eq('data', targetDate)
        .neq('status', 'cancelado');

      if (!error && data) {
        bookedSlots = data
          .filter(b => (selectedStaff && selectedStaff.name !== "Qualquer Profissional" ? b.profissional === selectedStaff.name : true))
          .map(b => b.horario);
      }
    } catch (e) {
      console.warn("Falha ao buscar slots no Supabase, usando localStorage:", e);
    }
  }

  // Se não buscou do Supabase ou estiver offline, usa LocalStorage
  if (bookedSlots.length === 0) {
    const bookings = JSON.parse(localStorage.getItem("saas_bookings")) || [];
    bookedSlots = bookings
      .filter(b => b.date === targetDate && (selectedStaff ? b.staffId === selectedStaff.id : true) && b.status !== "cancelado")
      .map(b => b.time);
  }

  container.innerHTML = hoursSlots.map(time => {
    const isOccupied = bookedSlots.includes(time);
    const isSelected = selectedSlot === time;
    return `
      <div class="slot-btn ${isSelected ? 'active' : ''} ${isOccupied ? 'disabled' : ''}" 
           onclick="${isOccupied ? '' : `selectTimeSlot('${time}')`}">
        ${time}
      </div>
    `;
  }).join("");
}

window.selectTimeSlot = function(time) {
  selectedSlot = time;
  updateTimeSlots();
};

dateInput.addEventListener("change", () => {
  selectedSlot = null;
  updateTimeSlots();
});

// Funções para salvar dados no Supabase
async function salvarUsuarioNoBanco(nome, telefone, email) {
  if (!supabaseClient) return;
  try {
    const { error } = await supabaseClient
      .from('usuarios')
      .insert([{ nome, telefone, email }]);
    if (error) console.error("Erro ao salvar usuário no Supabase:", error.message);
  } catch (err) {
    console.error("Erro Supabase:", err);
  }
}

async function salvarAgendamentoNoBanco(booking) {
  if (!supabaseClient) return;
  try {
    const { error } = await supabaseClient
      .from('agendamentos')
      .insert([{
        id: booking.id,
        servico: booking.service,
        preco: booking.price,
        profissional: booking.staff,
        data: booking.date,
        horario: booking.time,
        cliente_nome: booking.client,
        cliente_telefone: booking.phone,
        observacoes: booking.notes,
        status: booking.status
      }]);
    if (error) console.error("Erro ao salvar agendamento no Supabase:", error.message);
  } catch (err) {
    console.error("Erro Supabase:", err);
  }
}

document.getElementById("booking-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!selectedService) {
    alert("Por favor, selecione um serviço!");
    return;
  }
  if (!selectedStaff) {
    alert("Por favor, selecione um profissional!");
    return;
  }
  if (!selectedSlot) {
    alert("Por favor, escolha um horário disponível!");
    return;
  }

  const clientName = document.getElementById("client-name").value;
  const clientPhone = document.getElementById("client-phone").value;
  const clientEmail = document.getElementById("client-email")?.value || "";
  const clientNotes = document.getElementById("client-notes").value;

  const newBooking = {
    id: "SAAS-" + Date.now().toString().slice(-6),
    service: selectedService.name,
    serviceId: selectedService.id,
    price: selectedService.price,
    staff: selectedStaff.name,
    staffId: selectedStaff.id,
    date: dateInput.value,
    time: selectedSlot,
    client: clientName,
    phone: clientPhone,
    notes: clientNotes,
    status: "confirmado",
    createdAt: new Date().toISOString()
  };

  // Salva no LocalStorage (garante que nunca falhe)
  const bookings = JSON.parse(localStorage.getItem("saas_bookings")) || [];
  bookings.push(newBooking);
  localStorage.setItem("saas_bookings", JSON.stringify(bookings));

  // Salva no Banco de Dados Supabase (se configurado)
  await salvarUsuarioNoBanco(clientName, clientPhone, clientEmail);
  await salvarAgendamentoNoBanco(newBooking);

  document.getElementById("modal-details").innerHTML = `
    <strong>${newBooking.service}</strong> com <strong>${newBooking.staff}</strong><br>
    Data: ${newBooking.date.split('-').reverse().join('/')} às ${newBooking.time}<br>
    Valor: R$ ${Number(newBooking.price).toFixed(2)}
  `;
  document.getElementById("success-modal").style.display = "flex";
});

selectedStaff = staffList[0];
renderServices();
renderStaff();
updateTimeSlots();

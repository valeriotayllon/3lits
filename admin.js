// Lógica do Painel Administrativo SAAS (com Suporte a Supabase)

const filterDateInput = document.getElementById("filter-date");
const todayStr = new Date().toISOString().split("T")[0];
filterDateInput.value = todayStr;

function seedDemoData() {
  const existing = localStorage.getItem("saas_bookings");
  if (!existing || JSON.parse(existing).length === 0) {
    const demo = [
      {
        id: "SAAS-101",
        service: "Corte de Cabelo",
        price: 40.0,
        staff: "Atendente Principal",
        staffId: 1,
        date: todayStr,
        time: "10:00",
        client: "Carlos Silva",
        phone: "(85) 98888-1111",
        status: "confirmado"
      },
      {
        id: "SAAS-102",
        service: "Combo Cabelo + Barba",
        price: 65.0,
        staff: "Profissional 2",
        staffId: 2,
        date: todayStr,
        time: "14:30",
        client: "Lucas Medeiros",
        phone: "(85) 99777-2222",
        status: "confirmado"
      }
    ];
    localStorage.setItem("saas_bookings", JSON.stringify(demo));
  }
}

async function loadBookings() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('agendamentos')
        .select('*');
      if (!error && data && data.length > 0) {
        return data.map(b => ({
          id: b.id,
          service: b.servico,
          price: b.preco,
          staff: b.profissional,
          date: b.data,
          time: b.horario,
          client: b.cliente_nome,
          phone: b.cliente_telefone,
          status: b.status
        }));
      }
    } catch (e) {
      console.warn("Usando localStorage como fallback.");
    }
  }
  return JSON.parse(localStorage.getItem("saas_bookings")) || [];
}

async function renderAdmin() {
  const bookings = await loadBookings();
  const selectedDate = filterDateInput.value;
  const filtered = bookings.filter(b => b.date === selectedDate);

  document.getElementById("stat-total").innerText = filtered.length;
  const confirmedList = filtered.filter(b => b.status === "confirmado");
  document.getElementById("stat-confirmed").innerText = confirmedList.length;
  
  const totalRevenue = confirmedList.reduce((acc, curr) => acc + (parseFloat(curr.price) || 0), 0);
  document.getElementById("stat-revenue").innerText = "R$ " + totalRevenue.toFixed(2);

  const tbody = document.getElementById("appointments-table-body");
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: var(--text-muted); padding: 2rem;">Nenhum agendamento para esta data.</td></tr>`;
    return;
  }

  filtered.sort((a, b) => a.time.localeCompare(b.time));

  tbody.innerHTML = filtered.map(b => {
    let badgeClass = b.status === "cancelado" ? "badge-cancelled" : "badge-confirmed";

    return `
      <tr>
        <td><strong>${b.time}</strong></td>
        <td>${b.client}</td>
        <td><a href="https://wa.me/55${String(b.phone).replace(/\D/g, '')}" target="_blank" style="color:var(--primary); text-decoration:none;">${b.phone}</a></td>
        <td>${b.service}</td>
        <td>${b.staff}</td>
        <td>R$ ${Number(b.price).toFixed(2)}</td>
        <td><span class="badge ${badgeClass}">${b.status.toUpperCase()}</span></td>
        <td>
          ${b.status !== 'cancelado' ? `<button class="btn-danger" onclick="cancelBooking('${b.id}')">Cancelar</button>` : `<span style="color:var(--text-muted); font-size:0.8rem;">Cancelado</span>`}
        </td>
      </tr>
    `;
  }).join("");
}

window.cancelBooking = async function(id) {
  if (confirm("Deseja realmente cancelar este horário?")) {
    if (supabaseClient) {
      await supabaseClient
        .from('agendamentos')
        .update({ status: 'cancelado' })
        .eq('id', id);
    }
    const local = JSON.parse(localStorage.getItem("saas_bookings")) || [];
    const updated = local.map(b => b.id === id ? { ...b, status: 'cancelado' } : b);
    localStorage.setItem("saas_bookings", JSON.stringify(updated));
    renderAdmin();
  }
};

filterDateInput.addEventListener("change", renderAdmin);

seedDemoData();
renderAdmin();

let ratingChartInstance = null;
let lastUsedHandle = null;
let showingProblems = false;

async function fetchStats() {
  const handle = document.getElementById("handleInput").value.trim();

  const isValidHandle = handle => /^[a-zA-Z0-9_.-]{1,24}$/.test(handle);

  if (handle === "") {
    alert("Handle cannot be empty.");
    return;
  }

  if (!isValidHandle(handle)) {
    alert("Invalid Handle. Use only letters, numbers, dots, underscores, or dashes (1–24 chars).");
    return;
  }

  // Fetch user info and rating data
  const infoRes = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`);
  const ratingRes = await fetch(`https://codeforces.com/api/user.rating?handle=${handle}`);
  const infoData = await infoRes.json();
  const ratingData = await ratingRes.json();

  if (infoData.status !== "OK" || ratingData.status !== "OK") {
    let inputErr = document.getElementById("userInfo");
    inputErr.innerHTML = "User not found.";
    inputErr.style.color = "red";

    if (ratingChartInstance) {
      ratingChartInstance.destroy();
      ratingChartInstance = null;
    }

    window._solvedProblems = [];
    document.getElementById("problemDropdown").innerHTML = "";
    document.getElementById("toggleProblemBtn").textContent = "Show Solved Problem List";
    showingProblems = false;
    return;
  }

  const user = infoData.result[0];
  document.getElementById("userInfo").innerHTML = `
    <p><strong>Handle:</strong> ${user.handle}</p>
    <p><strong>Rank:</strong> ${user.rank}</p>
    <p><strong>Rating:</strong> ${user.rating || 'Unrated'}</p>
    <p><strong>Max Rating:</strong> ${user.maxRating || 'N/A'}</p>
  `;

  const contests = ratingData.result;
  const labels = contests.map(c => c.contestName);
  const ratings = contests.map(c => c.newRating);

  const ctx = document.getElementById('ratingChart').getContext('2d');

  const pointBorderColors = ratings.map((_, i) => {
    if (i === 0) return 'blue';
    if (i === ratings.length - 1) return 'red';
    return 'gray';
  });

  const pointBackgroundColors = ratings.map(() => 'white');

  if (ratingChartInstance) {
    ratingChartInstance.destroy();
  }

  ratingChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        data: ratings,
        borderColor: 'yellow',
        backgroundColor: 'transparent',
        tension: 0.25,
        pointBorderColor: pointBorderColors,
        pointBackgroundColor: pointBackgroundColors,
        pointBorderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointHoverBorderWidth: 4,
        pointHoverBackgroundColor: 'white'
      }]
    },
    options: {
      animation: {
        duration: 1000,
        easing: 'easeOutQuart'
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          usePointStyle: true,
          callbacks: {
            title: (items) => labels[items[0].dataIndex],
            label: (item) => `Rating: ${item.formattedValue}`
          }
        }
      },
      scales: {
        x: { display: false },
        y: {
          display: true,
          ticks: { color: '#aaa' },
          grid: { color: '#eee' }
        }
      },
      responsive: true,
      maintainAspectRatio: false
    }
  });

  // ✅ Auto-refresh the problem list ONLY if already visible
  if (showingProblems) {
    await fetchProblems(true); // refresh problems silently
  }
}

async function loadSolvedProblems(handle) {
  const res = await fetch(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=100`);
  const data = await res.json();

  if (data.status !== "OK") {
    window._solvedProblems = [];
    return;
  }

  const seen = new Set();
  const problems = [];

  for (const sub of data.result) {
    if (sub.verdict === "OK") {
      const key = `${sub.problem.contestId}-${sub.problem.index}`;
      if (!seen.has(key)) {
        seen.add(key);
        problems.push({
          name: `${sub.problem.name} (${sub.problem.contestId}${sub.problem.index})`,
          url: `https://codeforces.com/problemset/problem/${sub.problem.contestId}/${sub.problem.index}`
        });
        if (problems.length === 25) break;
      }
    }
  }

  window._solvedProblems = problems;
}

async function fetchProblems(triggeredFromStats = false) {
  const handle = document.getElementById("handleInput").value.trim();
  const dropdown = document.getElementById("problemDropdown");
  const toggleBtn = document.getElementById("toggleProblemBtn");

  if (!handle) {
    alert("Handle cannot be empty.");
    return;
  }

  const isHandleChanged = lastUsedHandle !== handle;
  if (isHandleChanged || !window._solvedProblems) {
    await loadSolvedProblems(handle);
    lastUsedHandle = handle;
  }

  // Always refresh the list
  dropdown.innerHTML = "";
  window._solvedProblems.forEach(prob => {
    const option = document.createElement("option");
    option.textContent = prob.name;
    option.value = prob.url;
    dropdown.appendChild(option);
  });

  // ✅ Handle dropdown visibility
  if (!showingProblems && !triggeredFromStats) {
    dropdown.classList.remove("hidden");
    showingProblems = true;
  }

  // ✅ Add click-to-open functionality
  dropdown.addEventListener("change", () => {
    const selectedUrl = dropdown.value;
    if (selectedUrl) {
      window.open(selectedUrl, "_blank");
    }
  });
}

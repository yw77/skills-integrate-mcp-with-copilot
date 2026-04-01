document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const authStatus = document.getElementById("auth-status");
  const userMenuBtn = document.getElementById("user-menu-btn");
  const authMenu = document.getElementById("auth-menu");
  const loginModal = document.getElementById("login-modal");
  const openLoginBtn = document.getElementById("open-login-btn");
  const closeAuthMenuBtn = document.getElementById("close-auth-menu-btn");
  const cancelLoginBtn = document.getElementById("cancel-login-btn");
  const loginForm = document.getElementById("login-form");
  const logoutBtn = document.getElementById("logout-btn");
  const authMenuState = document.getElementById("auth-menu-state");

  let isTeacherLoggedIn = false;
  let teacherUsername = null;

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function updateAuthUi() {
    if (isTeacherLoggedIn) {
      authStatus.textContent = `Teacher logged in: ${teacherUsername}`;
      authMenuState.textContent = `Logged in as ${teacherUsername}`;
      openLoginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
    } else {
      authStatus.textContent = "Students can view registrations. Teachers must log in to register/unregister.";
      authMenuState.textContent = "Not logged in";
      openLoginBtn.classList.remove("hidden");
      logoutBtn.classList.add("hidden");
    }
  }

  async function refreshAuthStatus() {
    try {
      const response = await fetch("/auth/status");
      const data = await response.json();
      isTeacherLoggedIn = data.authenticated;
      teacherUsername = data.username;
    } catch (error) {
      isTeacherLoggedIn = false;
      teacherUsername = null;
      console.error("Error checking auth status:", error);
    }
    updateAuthUi();
  }

  function openModal(modal) {
    modal.classList.remove("hidden");
  }

  function closeModal(modal) {
    modal.classList.add("hidden");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  userMenuBtn.addEventListener("click", () => {
    openModal(authMenu);
  });

  closeAuthMenuBtn.addEventListener("click", () => {
    closeModal(authMenu);
  });

  openLoginBtn.addEventListener("click", () => {
    closeModal(authMenu);
    openModal(loginModal);
  });

  cancelLoginBtn.addEventListener("click", () => {
    closeModal(loginModal);
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("teacher-username").value;
    const password = document.getElementById("teacher-password").value;

    try {
      const response = await fetch(
        `/auth/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        { method: "POST" }
      );
      const data = await response.json();

      if (response.ok) {
        showMessage(data.message, "success");
        loginForm.reset();
        closeModal(loginModal);
        await refreshAuthStatus();
      } else {
        showMessage(data.detail || "Login failed", "error");
      }
    } catch (error) {
      showMessage("Login failed. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      const response = await fetch("/auth/logout", { method: "POST" });
      const data = await response.json();
      if (response.ok) {
        showMessage(data.message, "success");
      }
    } catch (error) {
      console.error("Error logging out:", error);
    }

    closeModal(authMenu);
    await refreshAuthStatus();
  });

  // Initialize app
  refreshAuthStatus();
  fetchActivities();
});

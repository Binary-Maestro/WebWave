document.addEventListener("DOMContentLoaded", function () {
  document.querySelector(".loginbtn").addEventListener("click", function () {
    const url = "http://localhost:3000/api/login";
    const data = {
      username: document.querySelector(".user").value,
      password: document.querySelector(".pass").value,
    };
    console.log(data);
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((response) => response.json())
      .then((responseData) => {
        console.log(responseData);
      })
      .catch((error) => {
        console.error("Fetch error:", error);
      });
  });
});

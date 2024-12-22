const http = require("http");
const url = require("url");

// In-memory data
let phones = [
  { id: 1, name: "iPhone 14", brand: "Apple", price: 1200, stock: 10 },
  { id: 2, name: "Galaxy S23", brand: "Samsung", price: 900, stock: 15 },
  { id: 3, name: "Pixel 7", brand: "Google", price: 800, stock: 8 },
];

let cart = [];

// Helper functions
const sendResponse = (res, statusCode, data) => {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
};

const parseRequestBody = (req) =>
  new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });

// Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const { pathname, query } = parsedUrl;

  // GET /phones
  if (req.method === "GET" && pathname === "/phones") {
    let result = phones;

    if (query.brand) {
      result = result.filter((phone) => phone.brand === query.brand);
    }

    if (query.maxPrice) {
      result = result.filter((phone) => phone.price <= Number(query.maxPrice));
    }

    sendResponse(res, 200, result);

    // GET /phones/:id
  } else if (req.method === "GET" && pathname.startsWith("/phones/")) {
    const id = Number(pathname.split("/")[2]);
    const phone = phones.find((p) => p.id === id);

    if (phone) {
      sendResponse(res, 200, phone);
    } else {
      sendResponse(res, 404, { error: "Phone not found" });
    }

    // POST /phones
  } else if (req.method === "POST" && pathname === "/phones") {
    try {
      const body = await parseRequestBody(req);

      const { name, brand, price, stock } = body;
      if (!name || !brand || !price || !stock) {
        return sendResponse(res, 400, { error: "Invalid data" });
      }

      const newPhone = {
        id: phones.length ? phones[phones.length - 1].id + 1 : 1,
        name,
        brand,
        price,
        stock,
      };

      phones.push(newPhone);
      sendResponse(res, 201, newPhone);
    } catch (error) {
      sendResponse(res, 400, { error: "Invalid JSON format" });
    }

    // PUT /phones/:id
  } else if (req.method === "PUT" && pathname.startsWith("/phones/")) {
    const id = Number(pathname.split("/")[2]);
    const phoneIndex = phones.findIndex((p) => p.id === id);

    if (phoneIndex === -1) {
      return sendResponse(res, 404, { error: "Phone not found" });
    }

    try {
      const body = await parseRequestBody(req);
      const { name, brand, price, stock } = body;

      if (!name && !brand && !price && !stock) {
        return sendResponse(res, 400, { error: "No fields to update" });
      }

      phones[phoneIndex] = { ...phones[phoneIndex], ...body };
      sendResponse(res, 200, phones[phoneIndex]);
    } catch (error) {
      sendResponse(res, 400, { error: "Invalid JSON format" });
    }

    // DELETE /phones/:id
  } else if (req.method === "DELETE" && pathname.startsWith("/phones/")) {
    const id = Number(pathname.split("/")[2]);
    const phoneIndex = phones.findIndex((p) => p.id === id);

    if (phoneIndex === -1) {
      return sendResponse(res, 404, { error: "Phone not found" });
    }

    const deletedPhone = phones.splice(phoneIndex, 1)[0];
    sendResponse(res, 200, deletedPhone);

    // POST /cart
  } else if (req.method === "POST" && pathname === "/cart") {
    try {
      const body = await parseRequestBody(req);
      const { phoneId, quantity } = body;

      const phone = phones.find((p) => p.id === phoneId);
      if (!phone || phone.stock < quantity) {
        return sendResponse(res, 400, { error: "Not enough stock" });
      }

      const cartItem = cart.find((item) => item.phoneId === phoneId);
      if (cartItem) {
        cartItem.quantity += quantity;
      } else {
        cart.push({ phoneId, quantity });
      }

      phone.stock -= quantity;
      sendResponse(res, 200, cart);
    } catch (error) {
      sendResponse(res, 400, { error: "Invalid JSON format" });
    }

    // GET /cart
  } else if (req.method === "GET" && pathname === "/cart") {
    const result = cart.map((item) => {
      const phone = phones.find((p) => p.id === item.phoneId);
      return { ...item, totalPrice: phone.price * item.quantity };
    });

    sendResponse(res, 200, result);

    // DELETE /cart
  } else if (req.method === "DELETE" && pathname === "/cart") {
    const { phoneId } = query;

    const cartIndex = cart.findIndex(
      (item) => item.phoneId === Number(phoneId)
    );
    if (cartIndex === -1) {
      return sendResponse(res, 404, { error: "Item not in cart" });
    }

    cart.splice(cartIndex, 1);
    sendResponse(res, 200, cart);

    // POST /checkout
  } else if (req.method === "POST" && pathname === "/checkout") {
    if (cart.length === 0) {
      return sendResponse(res, 400, { error: "Cart is empty" });
    }

    for (const item of cart) {
      const phone = phones.find((p) => p.id === item.phoneId);
      if (!phone || phone.stock < item.quantity) {
        return sendResponse(res, 400, {
          error: "Not enough stock for checkout",
        });
      }
    }

    cart = [];
    sendResponse(res, 200, { message: "Order placed successfully" });

    // 404 Not Found
  } else {
    sendResponse(res, 404, { error: "Not Found" });
  }
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

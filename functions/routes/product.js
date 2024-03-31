const router = require("express").Router();
const { response } = require("express");
const admin = require("firebase-admin");
const db = admin.firestore();
const express = require("express");
// const { baseURL } = require("../../../client/src/api");
const stripe = require(`stripe`)(process.env.STRIPE_KEY);

router.post("/create", async (req, res) => {
  try {
    const id = Date.now();
    const data = {
      productID: id,
      product_name: req.body.product_name,
      product_category: req.body.product_category,
      product_price: req.body.product_price,
      imageURL: req.body.imageURL,
    };
    app;
    const response = await db.collection("products").doc(`/${id}/`).set(data);
    console.log("done");
    return res.status(200).send({ success: true, data: response });
  } catch (error) {
    return res.send({ success: true, msg: `ERROR :${error}` });
  }
});

router.get("/", (req, res) => {
  return res.send("hello world");
});
router.get("/all", async (req, res) => {
  console.log("i am working");
  try {
    console.log("i am in try");
    let query = db.collection("products");
    let response = [];
    await query.get().then((querysnap) => {
      let docs = querysnap.docs;
      // console.log(`docs ${docs}`);
      docs.map((doc) => {
        response.push({ ...doc.data() });
      });
      console.log(`this is response : ${response.data}`);
      return response;
    });
    return res.send({
      success: true,
      msg: `done successfully !!!`,
      data: response,
    });
  } catch (error) {
    return res.send({ success: false, msg: `error ${error}` });
  }
});

router.delete("/delete/:productId", async (req, res) => {
  const producId = req.params.productId;
  try {
    await db
      .collection("products")
      .doc(`/${producId}/`)
      .delete()
      .then((result) => {
        console.log(result);
        return res.status(200).send({ success: true, data: result });
      });
  } catch (error) {
    res.send({ success: false, msg: `error ${error}` });
  }
});
router.post("/addToCart/:userId", async (req, res) => {
  const userId = req.params.userId;
  const productId = req.body.productID;
  console.log(" these are the ids");
  console.log(userId);
  console.log(productId);

  try {
    const doc = await db
      .collection("cartItems")
      .doc(`/${userId}/`)
      .collection("items")
      .doc(`/${productId}/`)
      .get();
    if (doc.data()) {
      const quantity = doc.data().quantity + 1;
      const updatedItem = await db
        .collection("cartItems")
        .doc(`/${userId}/`)
        .collection("items")
        .doc(`/${productId}/`)
        .update({ quantity });
      return res.status(200).send({ success: true, data: updatedItem });
    } else {
      const data = {
        productId: productId,
        product_name: req.body.product_name,
        product_category: req.body.product_category,
        product_price: req.body.product_price,
        imageURL: req.body.imageURL,
        quantity: 1,
      };
      console.log(data);
      const addItems = await db
        .collection("cartItems")
        .doc(`/${userId}/`)
        .collection("items")
        .doc(`/${productId}/`)
        .set(data);
      return res.send({ success: true, data: addItems });
    }
  } catch (error) {
    res.send({ success: false, msg: `error ${error}` });
  }
});

router.post("/updateCart/:user_id", async (req, res) => {
  const userId = req.params.user_id;
  const productId = req.query.productId;
  const type = req.query.type;
  console.log(userId);
  console.log(productId);
  console.log(type);

  try {
    const doc = await db
      .collection("cartItems")
      .doc(`/${userId}/`)
      .collection("items")
      .doc(`/${productId}/`)
      .get();
    if (doc.data()) {
      if (type === "increment") {
        const quantity = doc.data().quantity + 1;
        await db
          .collection("cartItems")
          .doc(`/${userId}/`)
          .collection("items")
          .doc(`/${productId}/`)
          .update({ quantity: quantity });
        return res.status(200).send({ success: true, msg: "item updated" });
      } else {
        if (doc.data().quantity === 1) {
          await db
            .collection("cartItems")
            .doc(`/${userId}/`)
            .collection("items")
            .doc(`/${productId}/`)
            .delete();
          return res.status(200).status({ success: true, msg: "itme updated" });
        } else {
          const quantity = doc.data().quantity - 1;
          await db
            .collection("cartItems")
            .doc(`/${userId}/`)
            .collection("items")
            .doc(`/${productId}/`)
            .update({ quantity });
          return res.status(200).send({ success: true, msg: "item updated" });
        }
      }
    }
  } catch (error) {
    console.log(`error in increment / decremetn :${error}`);
  }
});

router.post("/getCartItems/:user_id", async (req, res) => {
  (async () => {
    try {
      const user_id = req.params.user_id;
      let query = db
        .collection("cartItems")
        .doc(`/${user_id}/`)
        .collection("items");
      let response = [];
      await query.get().then((querysnap) => {
        let docs = querysnap.docs;
        docs.map((doc) => {
          response.push({ ...doc.data() });
        });
        return response;
      });
      return res.status(200).send({ success: true, data: response });
    } catch (error) {
      return res.send({ success: false, data: response });
    }
  })();
});

router.post("/create-checkout-session", async (req, res) => {
  console.log(`this is my cart ${req.body.data.cart}`);

  const customer = await stripe.customers.create({
    metadata: {
      user_id: req.body.data.user.user_id,
      cart: JSON.stringify(req.body.data.cart),
      total: req.body.data.total,
    },
  });
  const line_items = req.body.data.cart.map((item) => {
    return {
      price_data: {
        currency: "inr",
        product_data: {
          name: item.product_name,
          images: [item.imageURL],
          metadata: {
            id: item.producId,
          },
        },
        unit_amount: item.product_price * 100,
      },
      quantity: item.quantity,
    };
  });
  const session = await stripe.checkout.sessions.create({
    line_items,
    customer: customer.id,
    mode: "payment",
    success_url: `${process.env.CLIENT_URL}/checkout_success`,
    cancel_url: "http://localhost:4242/cancel",
  });

  res.send({ url: session.url });
});

//********************************** */

let endpointSecret;
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const sig = req.headers["stripe-signature"];

    let eventType;
    let data;
    console.log("i am active ");
    if (endpointSecret) {
      let event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      } catch (err) {
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
      }
      data = event.data.object;
      eventType = event.type;
    } else {
      data = req.body.data.object;
      eventType = req.body.type;
    }

    // Handle the event
    if (eventType === "checkout.session.completed") {
      stripe.customers.retrieve(data.customer).then((customer) => {
        console.log("customer details", customer);
        // console.log("data", data);
        createOrder(customer, data, res);
      });
    }

    // Return a 200 res to acknowledge receipt of the event
    res.send().end();
  }
);
const createOrder = async (customer, intent, res) => {
  try {
    console.log("out then in create");

    const orderId = Date.now();
    const Data = {
      intentId: intent.id,
      orderId: orderId,
      amount: intent.amount_total,
      created: intent.created,
      // payment_method_types: intent.payment_method_types,
      status: intent.payment_status,
      customer: intent.customer_details,
      // shipping_details:intent.shipping_details,
      userId: customer.metadata.user_id,
      items: JSON.parse(customer.metadata.cart),
      total: customer.metadata.total,
      sts: "preparing",
    };
    console.log("out then");

    await db
      .collection("orders")
      .doc(`/${orderId}/`)
      .set(Data)
      .then(() => {
        console.log("in then");
        deleteCart(
          customer.metadata.user_id,
          JSON.parse(customer.metadata.cart)
        );
        console.log("*******************************************");
        return res.status(200).send({ success: true });
      });
  } catch (error) {
    console.log(`error in making customer id:${error}`);
  }
};

const deleteCart = async (userId, items) => {
  console.log(userId);
  console.log("**********************************");
  items.map(async (data) => {
    console.log(
      "---------------inside-----------------------",
      userId,
      data.producId
    );
    await db
      .collection("cartItems")
      .doc(`/${userId}/`)
      .collection("items")
      .doc(`/${data.productId}/`)
      .delete()
      .then(() => console.log("------------success-----------------"));
  });
};

router.get("/orders", async (req, res) => {
  try {
    let query = db.collection("orders");
    let response = [];
    await query.get().then((querysnap) => {
      let docs = querysnap.docs;
      // console.log(`docs ${docs}`);
      docs.map((doc) => {
        response.push({ ...doc.data() });
      });
      console.log(`this is response : ${response.data}`);
      return response;
    });
    return res.send({
      success: true,
      msg: `done successfully !!!`,
      data: response,
    });
  } catch (error) {
    return res.send({ success: false, msg: `error ${error}` });
  }
});

router.post("/updateOrder/:order_id", async (req, res) => {
  const order_id = req.params.order_id;
  const sts = req.query.sts;
  try {
    const updateItem = await db
      .collection("orders")
      .doc(`/${order_id}/`)
      .update({ sts });
    return res.status(200).send({ success: true, data: updateItem });
  } catch (error) {
    console.log(`erorr in updating the order itme : ${error}`);
  }
});

router.post(
  "/updateLikes/:id",
  async (req, res) => {
    const id = req.params.id;
    let response = [];
    console.log("this is id ", id);
    let query = db.collection("Favourites");
    await query.get().then((querysnap) => {
      let docs = querysnap.docs;
      docs.map((doc) => {
        response.push({ ...doc.data() });
      });

      return response;
    });
    console.log(response[0]);
    const type = req.query.type;
    if (type === "curry") {
      response[0].curry += 1;
    }
    if (type === "drinks") {
      response[0].drinks += 1;
    }
    if (type === "fruits") {
      response[0].fruits += 1;
    }
    if (type === "deserts") {
      response[0].deserts += 1;
    }

    return res.status(200).send({ success: true, data: response });
  }
  // if (updatedlikes.data()) {
  //   const quant = doc.data.typ + 1;
  //   await db.collection("Favourites").doc(`/${id}/`).update({ type: quant });
  //   return res.status(200).send({ success: true });
  // }
);

module.exports = router;

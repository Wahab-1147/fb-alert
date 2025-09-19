const mqtt = require("mqtt");
const nodemailer = require("nodemailer");
const { BloomFilter } = require("bloom-filters");
const fs = require("fs");

// Bloom filter init
const bloom = new BloomFilter(10000, 4);

// SMTP transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// MQTT connect
const client = mqtt.connect("wss://edge-mqtt.facebook.com");

client.on("connect", () => {
  client.subscribe("/commerce/classifieds/new_listing/US_*");
});

client.on("message", (topic, msg) => {
  const listing = JSON.parse(msg.toString());
  const id = listing.id;

  if (!bloom.has(id)) {
    bloom.add(id);
    // Save to file dedupe
    fs.appendFileSync("listings.txt", id + "\n");

    // Send email
    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.RECEIVER_EMAIL,
      subject: `New Car: ${listing.marketplace_listing_title}`,
      text: `Title: ${listing.marketplace_listing_title}\nPrice: ${listing.list_price}\nLink: https://facebook.com/marketplace/item/${listing.id}`
    }, (err) => { if(err) console.error(err); });
  }
});

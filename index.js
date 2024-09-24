const express = require("express");
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid"); // Import uuid for unique IDs
require("dotenv").config();
const app = express();

// Middleware to parse JSON and URL-encoded bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Route to convert HTML to PDF and return as buffer
app.post("/generate-pdf", async (req, res) => {
  const { html } = req.body;

  if (!html) {
    return res.status(400).send("HTML content is required");
  }

  try {
    // Launch Puppeteer
    const browser = await puppeteer.launch({
      args: [
        "--disable-setuid-sandbox",
        "--no-sandbox",
        // "--single-process",
        "--no-zygote",
      ],
      executablePath:
        process.env.NODE_ENV === "production"
          ? process.env.PUPPETEER_EXECUTABLE_PATH
          : puppeteer.executablePath(),
    });
    const page = await browser.newPage();
    await page.setContent(html);

    // Generate a unique file name for the PDF
    const pdfFileName = `generated_pdf_${uuidv4()}.pdf`;
    const pdfPath = path.join(__dirname, pdfFileName);
    const scrollHeight = await page.evaluate(() => {
      return document.documentElement.scrollHeight;
    });

    await page.pdf({
      path: pdfPath,
      width: "800px", // Adjust width as needed
      height: `${scrollHeight + 60}px`, // Add 60px to the calculated scroll height
      printBackground: true, // Ensure background is printed
    });

    await browser.close();

    // Read the PDF file into a buffer
    const pdfBuffer = fs.readFileSync(pdfPath);

    // Optionally, delete the PDF file after reading
    fs.unlinkSync(pdfPath);

    // Send the PDF buffer in the response
    res.setHeader("Content-Type", "application/pdf");
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send(`Failed to generate PDF: ${error}`);
  }
});

// Example route for HTML form (optional, for testing)
app.get("/", (req, res) => {
  res.send("Puppeteer renderer working!");
});

// Start the server
const PORT = process.env.PORT || 8737;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

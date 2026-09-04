const express = require("express");

const {
  createImage,
  getImages,
  processImageController,
} = require("../controllers/image.controller");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Images
 *   description: Image management and AI processing
 */

/**
 * @swagger
 * /api/images:
 *   post:
 *     summary: Create a new image
 *     tags: [Images]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filename
 *               - image_url
 *             properties:
 *               filename:
 *                 type: string
 *                 example: mountain.jpg
 *               image_url:
 *                 type: string
 *                 example: https://images.unsplash.com/photo-1500530855697-b586d89ba3ee
 *     responses:
 *       201:
 *         description: Image created successfully
 *       400:
 *         description: Invalid image data
 */
router.post("/", createImage);

/**
 * @swagger
 * /api/images:
 *   get:
 *     summary: Get all images
 *     tags: [Images]
 *     responses:
 *       200:
 *         description: List of images
 */
router.get("/", getImages);

/**
 * @swagger
 * /api/images/{id}/process:
 *   post:
 *     summary: Process an image using AI
 *     description: Analyzes the image with Gemini Vision and generates a 1536-dimensional embedding.
 *     tags: [Images]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Image UUID
 *     responses:
 *       200:
 *         description: Image processed successfully
 *       404:
 *         description: Image not found
 *       500:
 *         description: Image processing failed
 */
router.post("/:id/process", processImageController);

module.exports = router;
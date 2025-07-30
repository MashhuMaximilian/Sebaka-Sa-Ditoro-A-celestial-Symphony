# Celestial Symphony

Welcome to Celestial Symphony, an interactive 3D celestial simulation built with Next.js and Three.js. Explore a detailed, fictional solar system, customize planetary appearances with AI, and experience the sky from the surface of the homeworld, Sebaka.

![Celestial Symphony Screenshot](https://placehold.co/800x400.png?text=Celestial+Symphony)
*A placeholder image of the Celestial Symphony simulation.*

## Features

*   **Interactive 3D Solar System**: A fully rendered 3D visualization of a unique solar system with multiple stars and planets.
*   **Accurate Orbital Mechanics**: Planets and stars follow orbital paths based on the system's unique lore, including binary star systems and eccentric orbits.
*   **Dynamic Lighting**: The scene is dynamically lit by the multiple stars in the system, creating realistic and beautiful lighting on the planets.
*   **First-Person "View from Sebaka"**: Switch to a first-person perspective from the surface of the homeworld, Sebaka, to see the sky and celestial events as an inhabitant would.
*   **AI-Powered Color Harmonizer**: Use a Genkit-powered AI flow to generate harmonious color palettes for the planets based on a single color input.
*   **Detailed Information Panel**: Click on any celestial body to open a side panel with detailed lore, physical characteristics, and appearance data.
*   **Customizable Materials**: Interactively tweak a wide array of material properties for each planet and star, including textures, displacement, shininess, and special effects like volcanic activity.
*   **Procedural Effects**: See planets come to life with advanced shaders, including the pulsating coronas of stars, iridescent rings of Spectris, and the cyclical volcanic eruptions on Viridis.
*   **Time Controls**: Speed up, slow down, or jump to a specific year and day in the simulation to observe long-term celestial events.

## Tech Stack

*   **Framework**: [Next.js](https://nextjs.org/) (with App Router)
*   **3D Rendering**: [Three.js](https://threejs.org/)
*   **AI/Generative**: [Firebase Genkit](https://firebase.google.com/docs/genkit)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or another package manager

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd <your-repository-name>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project and add your Genkit/Google AI API key:
    ```env
    GEMINI_API_KEY=your_api_key_here
    ```

### Running the Application

1.  **Start the development server:**
    This command runs the Next.js application.
    ```bash
    npm run dev
    ```

2.  **Start the Genkit developer UI (optional):**
    In a separate terminal, run this command to inspect and test your AI flows.
    ```bash
    npm run genkit:dev
    ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. The Genkit UI will be available at [http://localhost:4000](http://localhost:4000).

## Key Files & Structure

*   `src/app/page.tsx`: The main React component that brings all the UI and the 3D canvas together.
*   `src/components/celestial-symphony.tsx`: The primary component that manages the Three.js scene and simulation logic.
*   `src/components/CelestialSymphony/`: Directory containing all Three.js related logic, hooks, and utilities.
    *   `hooks/`: React hooks that encapsulate major functionalities like scene initialization, animation loop, camera controls, etc.
    *   `utils/`: Helper functions for creating meshes, orbits, and calculating positions.
    *   `shaders/`: GLSL shader code for advanced visual effects like the planet materials, stars, and volcanic activity.
*   `src/ai/`: Contains all Genkit-related code.
    *   `flows/color-harmonizer.ts`: The Genkit flow for generating color palettes.
*   `src/types/index.ts`: TypeScript type definitions for the celestial bodies and material properties.
*   `public/maps`: Contains the texture maps used for the celestial bodies.

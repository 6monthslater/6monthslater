# Web Server

This project handles the front-end UI and the backend server for generating statistics and talk to the scraping service.

The web server is built using the Remix framework in TypeScript. This part of the application handles the front-end UI, authentication, and communicating with Rabbit-MQ to tell the scraper what to do. It also listens to events from the scraper for when scraping is finished and saves this information into the database.

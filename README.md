# 6 Months Later

The Long-term Product Reliability Assessment Assistant.

Most reviews written these days only cover the product at launch
and not how it holds up several months (or years) later.

6 Months Later is a web application storing longer-term (6+ months) reports
on product .

More information on the architecture is available in our
[wiki](https://github.com/6monthslater/6monthslater/wiki), as well as the 
dedicated READMEs in each module folder.

A demo of 6 Months Later is available on YouTube. Click on the thumbnail below or [this link](https://youtu.be/qtHc23TtdbE)
to watch the video.

[![IMAGE ALT TEXT HERE](https://img.youtube.com/vi/qtHc23TtdbE/hq1.jpg)](https://youtu.be/qtHc23TtdbE)

6 Months Later was created as part of a Software Engineering capstone project at the University of Ottawa.

## Building and Running

Folder Structure:

`├── server` The Remix web server application (frontend + backend)

`├── docker` Configuration files for running Postgres and RabbitMQ in docker

`├── scraper` The Python scraper application and it's shared files

`│   ├── crawler.py` The Python Crawler application. Starts a daemon that waits for messages in RabbitMQ

`│   ├── scraper.py` The Python Scraper application. Starts a daemon that waits for messages in RabbitMQ

`│   ├── analyzer.py` The Python Analysis application. Starts a daemon that waits for messages in RabbitMQ

### Postgres and RabbitMQ

Postgres is used by the web server to store data.

RabbitMQ is used by all services to communicate with each other.

Before the first start in development, 
you must create the database schema. 
This can be done by running `npx prisma migrate dev` in the `server` folder.

These can be started during development with docker using
`docker-compose up -d database queue`.

### Web Server

The web server is a [Remix](https://remix.run/) application.

Owing to the structure of Remix and fullstack, 
the server is simultaneously the frontend as well as the backend.

You first must install the Node.js dependencies.

```bash
cd server
npm install
```

Check to see if `./server/.husky` exists with the expected contents. 

If it's missing, you must also run `npm run prepare` to enable the pre-commit hooks.

Then you can start the server with `npm run dev`.

`npm run start` can be used to start the Remix server in production mode,
but 6 Months Later as a whole should be deployed using Docker Compose, discussed
below. When using Docker Compose, this command is not necessary.

Note that all server-related commands (such as `npm`) MUST be executed in
the `server` folder.

### Creating a local admin account

All admin pages on the web server are access controlled. 
You will need to grant yourself admin privileges when setting up a 
local copy of the repository in order to gain access to these pages.

1. Start the web server (detailed above).
2. Sign up for an account (Login --> Sign Up)
3. Verify your email through the link sent to you.
4. Go to the Supabase Authentication dashboard belonging to your instance of the project.
5. Copy the User UID associated with your account.
6. Use that UUID as the value for `ADMIN_UUID` in `.env`.
7. In a terminal, run the following:

```bash
cd server
npx prisma db seed
```

You should now be an Admin. Test this by navigating to the [User Management Page](http://localhost:3000/admin/users).

Future admins can be added (and removed) directly from that page.

### Scraper

The scraper is a Python application and is divided into three parts.

Firstly, run the `setup.sh` bash script to install the SUTime library used by the analyzer. 
The script may fail if Maven is not installed on your system: if `mvn -v` is not recognized as a command, please first [install Maven](https://maven.apache.org/install.html). If the script succeeds, the folder `analyzer/jars` should now exist.

You must then install create a Python Virtual Environment and install the remaining dependencies.

```bash
cd scraper
python3 -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate

pip install -r requirements.txt
python -m textblob.download_corpora

cp .env.example .env # Create environment variables file based on the example
```

Then you can start the daemons with `python crawler.py` and `python scraper.py`.

These daemons will wait for messages in RabbitMQ, and execute their tasks accordingly.

For more information on running and testing the analyzer, see the [Analyzer documentation](./scraper/analyzer/README.md).

Automated tests are available for the parser and analyzer.
These can be executed by running `pytest`.

Further information about how the scraper works can be found in the [Scraper documentation](./scraper/README.md).

## Deployment

Deployment is done through the docker compose file. You must first install docker, 
then set values for all of the environment variables.

To set up the configuration files, run the following command:

```bash
cd docker
./setup.sh
```

Then, fill in the values in each of the following `*.env` files:
- `.database.env`
- `.server.env`
- `.caddy.env`

The other `*.env` files have default values, or are blank. They must exist but do not need to be edited.

**WARNING: The credentials in `docker/.database.env` must match the credentials in the `DATABASE_URL` in `docker/.server.env`.**

Then you can run `docker compose up -d` to start the application.

If you want to run while using a VPN proxy, you can configure `docker/wireproxy-config` with the appropriate values, and then run `docker compose --profile proxy up -d`;

Note: If you are on an old version of docker, you may need to use `docker-compose` instead of `docker compose`.

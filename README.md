# 6 Months Later

A Long-term Product Reliability Review Platform

6 Months Later a web application where various consumer goods are given reliability ratings over longer periods of time (6+ months). Most reviews written these days only cover the product at launch and not how it holds up several months (or years) later.

More information available in our [wiki](https://github.com/6monthslater/6monthslater/wiki)

## Building and Running

Folder Structure:

`├── server` The Remix web server application

`├── docker` Configuration files for running Postgres and RabbitMQ in docker

`├── scraper` The Python scraper application and it's shared files

`│   ├── crawler.py` The Python Crawler application. Starts a daemon that waits for messages in RabbitMQ

`│   ├── scraper.py` The Python Scraper application.  Starts a daemon that waits for messages in RabbitMQ

`│   ├── analyzer.py` The Python Analysis application

### Postgres and RabbitMQ

Postgres is used by the web server to store data and RabbitMQ is used by all services to communicate with eachother.

These can be started with docker using `docker-compose up`

### Web Server

The web server is a remix application.

You first must install the dependencies.

```bash
cd server
npm install
```

Check to see if `./server/.husky` exists with the expected contents. 

If it's missing, you must also run `npm run prepare` in `./server/` to enable the pre-commit hooks.

Then you can start the server with `npm run dev` or `npm run start` in production.

#### First run

For a first run, you must create the database schema. This can be done by running `npx prisma migrate dev` in the `server` folder.

### Creating a local admin account

The web server is access controlled. You will need to grant yourself admin privileges when setting up a 
local copy of the repository.

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

Firstly, run the `setup.sh` bash script to install the SUTime library used by the analyzer. The script may fail if Maven is not installed on your system: if `mvn -v` is not recognized as a command, please first [install Maven](https://maven.apache.org/install.html). If the script succeeds, the folder `analyzer/jars` should now exist.

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

These daemons will wait for messages in RabbitMQ, and execute accordingly.

For more information on running and testing the analyzer, see its [README file](./scraper/analyzer/README.md)

Automated tests are available for the parser and analyzer, and can be executed by running `pytest`.

Further information about how the scraper works can be found in [it's dedicated documentation](./scraper/README.md).

## Deployment

Deployment is done through the docker compose file. You must first install docker, then setup the environment variable configurations.

To setup the configuration files, rename each `.env.example` file in the `docker` folder to `.env` and fill in the values. The credentials in `docker/database.env` must match the credentials in the `DATABASE_URL` in `docker/server.env`.

Then you can run `docker-compose up` to start the application.
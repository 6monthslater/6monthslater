FROM python:3.11 as base
WORKDIR /usr/src/app
COPY . .
RUN pip install -r requirements.txt
EXPOSE 80

FROM base as scraper
CMD python scraper.py

FROM base as crawler
CMD python crawler.py

FROM base as analyzer
RUN apt update && apt-get install default-jdk -y
RUN python -m textblob.download_corpora
RUN ./setup.sh
CMD python analyzer.py
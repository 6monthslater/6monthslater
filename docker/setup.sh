#!/bin/bash
cp analyzer.env.example analyzer.env --no-clobber || true
cp caddy.env.example caddy.env --no-clobber || true
cp crawler.env.example crawler.env --no-clobber || true
cp database.env.example database.env --no-clobber || true
cp scraper.env.example scraper.env --no-clobber || true
cp server.env.example server.env --no-clobber || true
cp shared_scraper.env.example shared_scraper.env --no-clobber || true

#!/bin/bash
# Sets up SUTime by installing wrapped jars + textblob corpora for training classifiers
cd analyzer
mvn dependency:copy-dependencies -DoutputDirectory=./jars
read -p "Press Enter to exit script"

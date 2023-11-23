#!/bin/bash
# Sets up SUTime by installing wrapped jars + textblob corpora for training classifiers
cd analyzer
mvn dependency:copy-dependencies -DoutputDirectory=./jars

if [ "$DOWNLOAD_TRAINING" != "0" ]
then
    cd ..
    mkdir -p models
    cd models

    wget https://huggingface.co/TheBloke/CodeLlama-7B-Instruct-GGUF/resolve/main/codellama-7b-instruct.Q5_K_S.gguf
fi
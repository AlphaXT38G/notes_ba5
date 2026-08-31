# Cours du 19/05/2026 
## Deep Learning #3 - Natural Language Processing (NLP)
*(In both supervised and unsupervised settings)*

**Goal:** Find whether a text has a positive/negative emotion

Usefull links:
- https://text-processing.com/demo/sentiment/
- https://nlp.johnsnowlabs.com/demos

A BoW encodes an entire document in an single vector.
- This is fine when the targeted ML task is at document-level
- However this won't work for word-level tasks (e.g. translation, text generation)

**In neural NLP** words are vectors

![alt text](temp/words-as-vectors.png)

**PROBLEM:** With this representation, there is no similarity between words !

How do you learn similarity between words ?

![alt text](temp/word-embeddings.png)

Such that the dot product encodes the similarity between words.

### Word embeddings:
Supervised
- Optimize the embeddings for a specific task (e.g., sentiment analysis)
- Downsides: Requires supervised data, may not generalize to other tasks

Unsupervised (or self-supervised)
- “You shall know a word by the company it keeps”; J. R. Firth, 1957

**Limitations:**
- With a representation for each word, we still suffer from data heterogenity (input with different lenghts)
- Individual words are unreliable 
![alt text](temp/individual-word-reliability.png)


### Sequence to sequence models:
Instead of modeling words, the standard approach consists of modeling a complete sentence or document as a sequence

![alt text](temp/seq2seq.png)

how do we model each block ?

![alt text](temp/model-each-block-solution.png)

![alt text](temp/unrolling-rnn.png)

RNN = Recurrent neural networks

We can use RNN for:
- classificationo
- sequence labeling
- generation

Different type of RNN:
- Standard RNN
- Long Short-Term Memory (LSTM)
- Gated Recurrent Unit (GRU)

Training an encoder-decoder model

![alt text](temp/training-encoder-model.png)

- Backpropagate gradients through both the decoder and the encoder

**Limitations:**
- State represented as a single vector —> Massive compression of information
- Challenging to learn long-range dependencies/interactions

Dans le seq2seq classique, toute la phrase d'entrée était compressée dans un seul vecteur C. C'est comme si tu devais traduire un paragraphe après l'avoir lu une seule fois et n'avoir le droit de garder qu'une seule phrase de résumé en mémoire. Pour les phrases longues, ça devient catastrophique.

**Incorporating attention:**
- Recall: At each encoder time step, there is an output of the RNN!
- Idea: Use the output of the Decoder LSTM to compute an attention (mixture) over all the h_t^e outputs of the encoder LSTM
- Intuition: focus on different parts of the input at each time step

![alt text](temp/incorporating-attention.png)

![alt text](temp/attention-function.png)

![alt text](temp/attention-functions.png)

**Interpretability:**
- Main idea: attention can be visualised based on the score given to each encoder hidden state
- What is focused on when each word is generated ?
- Training with attention gives us implicit alignment for free!

![alt text](temp/interpretability.png)

**Problem: Encoder is recurrent**
- Encoder: not parallelized because the previous state needs to be computed before the next one
-> **Solution:** Transformer: encode sequences with self-attention

En amélioré j'imagine:
- masked multi-head self-attention
- Cross attention

### GPT: Generative Pretrained Transformer
ah oui quand même:
![alt text](temp/gpt-scale.png)
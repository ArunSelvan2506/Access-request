# Predicting Movie Success

A comprehensive data-analysis and machine-learning pipeline that predicts a
movie's success category — **Flop**, **Average**, or **Hit** — from its IMDB
attributes.

The success category (`Classify`) is derived from `imdb_score`:

| IMDB score | Category |
|---|---|
| 1 – 3 | Flop |
| 3 – 6 | Average |
| 6 – 10 | Hit |

## Project layout

```
predicting-movie-success/
├── data/
│   └── movie_metadata.csv        # 5,043 movies × 28 attributes
├── src/
│   └── movie_success_prediction.py   # end-to-end pipeline
├── outputs/
│   ├── figures/                  # EDA + model visualisations (generated)
│   ├── classification_report.txt # best-model report (generated)
│   └── results_summary.json      # metrics for all models (generated)
├── reports/
│   ├── project_brief.md          # original assignment brief
│   ├── data_dictionary.md        # variable descriptions
│   └── findings.md               # methodology, results & recommendations
└── requirements.txt
```

## What the pipeline does

1. **Load & clean** — de-duplicate, strip titles, drop rows without a score.
2. **Target engineering** — build the `Classify` column with `pd.cut`.
3. **EDA** — missing-value profile, score distribution, category counts,
   correlation heatmap, genre frequencies, and relationships with the target.
4. **Preprocessing & feature engineering** — median/mode imputation, label
   encoding, engineered features (`profit`, `genre_count`, `movie_age`), and
   multicollinearity removal (drops one of every |corr| > 0.85 pair).
5. **Modelling** — trains and compares Logistic Regression, KNN, Decision Tree,
   **Random Forest** (emphasised per the brief), and Gradient Boosting on an
   80/20 stratified split with standardised features.
6. **Evaluation** — confusion matrix, classification report, model-comparison
   chart, and Random-Forest feature importances.

## Running it

```bash
cd predicting-movie-success
pip install -r requirements.txt
python src/movie_success_prediction.py
```

All figures are written to `outputs/figures/` and metrics to
`outputs/results_summary.json` and `outputs/classification_report.txt`.

## Headline results

| Model | Accuracy | Weighted F1 |
|---|---|---|
| Logistic Regression | 0.732 | 0.712 |
| K-Nearest Neighbours | 0.716 | 0.704 |
| Decision Tree | 0.730 | 0.734 |
| **Random Forest** | **0.785** | **0.786** |
| Gradient Boosting | 0.792 | 0.784 |

Random Forest is the best model by weighted F1. The dataset is heavily
imbalanced (only 46 Flops out of ~5,000 movies), so the model predicts *Hit*
and *Average* well but struggles with the tiny *Flop* class. Audience/critic
engagement (`num_voted_users`, `num_critic_for_reviews`) and `duration` are the
strongest predictors. See [`reports/findings.md`](reports/findings.md) for the
full write-up.

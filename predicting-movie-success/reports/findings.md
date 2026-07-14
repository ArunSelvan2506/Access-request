# Predicting Movie Success — Findings & Methodology

## 1. Objective
Predict a movie's **success category** — *Flop*, *Average*, or *Hit* — from its
IMDB attributes, using the `Classify` target derived from `imdb_score`
(1–3 → Flop, 3–6 → Average, 6–10 → Hit).

## 2. Data preparation
- Loaded 5,043 rows; **4,998** remained after removing exact duplicates.
- Rows without `imdb_score` were dropped, then `Classify` was created with
  `pd.cut`.
- Missing values imputed: numeric columns → median, categorical → mode.
- Categorical variables label-encoded per the brief.
- **Feature engineering:** `profit` (gross − budget), `genre_count`,
  and `movie_age` (years since the newest title).
- **Multicollinearity:** one column of every pair with |corr| > 0.85 was
  dropped (`cast_total_facebook_likes`, `profit`), leaving 19 predictors.
- Identifier / free-text / leakage columns removed: `movie_title`,
  `movie_imdb_link`, `plot_keywords`, actor/director *names* (their Facebook
  likes are kept instead), and of course `imdb_score` itself.

## 3. Class distribution (key caveat)
The target is **heavily imbalanced**:

| Category | Movies |
|---|---|
| Flop | 46 |
| Average | 1,524 |
| Hit | 3,428 |

Only ~1% of movies are Flops, so the model has very little signal for that
class — reflected in the results below.

## 4. Model comparison
Five classifiers were trained on an 80/20 stratified split with standardised
features.

| Model | Accuracy | Weighted F1 |
|---|---|---|
| Logistic Regression | 0.732 | 0.712 |
| K-Nearest Neighbours | 0.716 | 0.704 |
| Decision Tree | 0.730 | 0.734 |
| **Random Forest** | **0.785** | **0.786** |
| Gradient Boosting | 0.792 | 0.784 |

**Random Forest** wins on weighted F1 (Gradient Boosting is marginally higher on
raw accuracy), matching the emphasis in the project brief. It was configured
with `class_weight="balanced"` to partially offset the imbalance.

## 5. Random Forest performance
| Category | Precision | Recall | F1 | Support |
|---|---|---|---|---|
| Flop | 0.00 | 0.00 | 0.00 | 9 |
| Average | 0.62 | 0.76 | 0.69 | 305 |
| Hit | 0.88 | 0.81 | 0.84 | 686 |
| **Accuracy** | | | **0.785** | 1000 |

The model discriminates *Hit* vs *Average* well but cannot identify *Flop*
movies — there are only 9 in the test set and 46 overall, too few to learn
from. See `outputs/figures/09_confusion_matrix.png`.

## 6. What drives the prediction
Top Random-Forest feature importances:

1. `num_voted_users` (0.116)
2. `num_critic_for_reviews` (0.108)
3. `duration` (0.086)
4. `num_user_for_reviews` (0.084)
5. `gross` (0.077)

Audience/critic engagement volume and runtime are the strongest signals;
budget and cast popularity contribute moderately. Full ranking in
`outputs/figures/10_feature_importance.png`.

## 7. Recommendations / next steps
- **Address imbalance** with SMOTE/oversampling or by merging Flop into a
  broader "not-Hit" class if the business question allows binary framing.
- **Hyperparameter tuning** (grid/random search, cross-validation) beyond the
  sensible defaults used here.
- Engineer richer features from `genres` (multi-hot) and `plot_keywords`.
- Optional deployment via Streamlit (see brief) using the trained Random Forest.

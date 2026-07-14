"""
Predicting Movie Success
========================

End-to-end data-analysis and machine-learning pipeline that predicts a movie's
success category ("Flop", "Average", "Hit") from its IMDB attributes.

The target categories are derived from ``imdb_score``:

    * 1 - 3  -> Flop
    * 3 - 6  -> Average
    * 6 - 10 -> Hit

The pipeline performs:
    1. Data loading and cleaning
    2. Exploratory Data Analysis (EDA) with visualisations
    3. Preprocessing, feature engineering and encoding
    4. Multicollinearity handling
    5. Training and comparison of several classification algorithms
       (with emphasis on Random Forest)
    6. Performance evaluation (confusion matrix + classification report)
    7. Feature-importance analysis

All figures are written to ``outputs/figures`` and text/JSON results to
``outputs``.  Run it from the project root or anywhere - paths are resolved
relative to this file.

Usage
-----
    python src/movie_success_prediction.py
"""

from __future__ import annotations

import json
import warnings
from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # headless backend so the script runs without a display
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier

warnings.filterwarnings("ignore")
sns.set_theme(style="whitegrid")
plt.rcParams["figure.autolayout"] = True

# --------------------------------------------------------------------------- #
# Paths
# --------------------------------------------------------------------------- #
PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = PROJECT_ROOT / "data" / "movie_metadata.csv"
FIG_DIR = PROJECT_ROOT / "outputs" / "figures"
OUT_DIR = PROJECT_ROOT / "outputs"
FIG_DIR.mkdir(parents=True, exist_ok=True)

RANDOM_STATE = 42

# Ordered category labels so plots/reports read Flop -> Average -> Hit.
CLASS_ORDER = ["Flop", "Average", "Hit"]


def savefig(name: str) -> None:
    """Save the current matplotlib figure into the figures directory."""
    path = FIG_DIR / name
    plt.savefig(path, dpi=120, bbox_inches="tight")
    plt.close()
    print(f"  saved figure -> {path.relative_to(PROJECT_ROOT)}")


# --------------------------------------------------------------------------- #
# 1. Load data
# --------------------------------------------------------------------------- #
def load_data() -> pd.DataFrame:
    print("\n[1] Loading data ...")
    df = pd.read_csv(DATA_PATH)
    # movie_title carries trailing whitespace / non-breaking chars in this dataset.
    df["movie_title"] = df["movie_title"].str.strip()
    df = df.drop_duplicates()
    print(f"    shape after de-duplication: {df.shape}")
    return df


# --------------------------------------------------------------------------- #
# 2. Target engineering: the `Classify` column
# --------------------------------------------------------------------------- #
def add_classify_column(df: pd.DataFrame) -> pd.DataFrame:
    """Categorise imdb_score into Flop / Average / Hit.

    Bins follow the project brief:  (1-3] Flop, (3-6] Average, (6-10] Hit.
    ``include_lowest`` keeps scores that sit exactly on the lower edge.
    """
    print("\n[2] Creating target column `Classify` from imdb_score ...")
    df = df.dropna(subset=["imdb_score"]).copy()
    df["Classify"] = pd.cut(
        df["imdb_score"],
        bins=[0, 3, 6, 10],
        labels=CLASS_ORDER,
        include_lowest=True,
    )
    df = df.dropna(subset=["Classify"])
    print("    class distribution:")
    for label, count in df["Classify"].value_counts().reindex(CLASS_ORDER).items():
        print(f"      {label:<8}: {count}")
    return df


# --------------------------------------------------------------------------- #
# 3. Exploratory Data Analysis
# --------------------------------------------------------------------------- #
def run_eda(df: pd.DataFrame) -> None:
    print("\n[3] Exploratory Data Analysis ...")

    # Missing-value summary
    missing = df.isnull().mean().mul(100).sort_values(ascending=False)
    missing = missing[missing > 0]
    if not missing.empty:
        plt.figure(figsize=(9, 6))
        sns.barplot(x=missing.values, y=missing.index, color="#4C72B0")
        plt.xlabel("% missing")
        plt.title("Missing values by column")
        savefig("01_missing_values.png")

    # IMDB score distribution
    plt.figure(figsize=(8, 5))
    sns.histplot(df["imdb_score"], bins=30, kde=True, color="#55A868")
    plt.title("Distribution of IMDB score")
    plt.xlabel("imdb_score")
    savefig("02_imdb_score_distribution.png")

    # Success category counts
    plt.figure(figsize=(7, 5))
    sns.countplot(x="Classify", data=df, order=CLASS_ORDER, palette="viridis")
    plt.title("Movie success categories")
    plt.xlabel("Success category")
    plt.ylabel("Number of movies")
    savefig("03_success_category_counts.png")

    # Correlation heatmap of numeric predictors
    numeric = df.select_dtypes(include=[np.number])
    plt.figure(figsize=(12, 9))
    sns.heatmap(numeric.corr(), annot=True, fmt=".2f", cmap="coolwarm",
                square=True, cbar_kws={"shrink": 0.7}, annot_kws={"size": 7})
    plt.title("Correlation matrix of numeric features")
    savefig("04_correlation_heatmap.png")

    # A few relationships with the target
    plt.figure(figsize=(8, 5))
    sns.boxplot(x="Classify", y="duration", data=df, order=CLASS_ORDER,
                palette="viridis")
    plt.title("Movie duration by success category")
    savefig("05_duration_by_category.png")

    plt.figure(figsize=(8, 5))
    sns.boxplot(x="Classify", y="num_voted_users", data=df, order=CLASS_ORDER,
                palette="viridis")
    plt.yscale("log")
    plt.title("Number of voted users by success category (log scale)")
    savefig("06_voted_users_by_category.png")

    # Top genres
    genres = (
        df["genres"].dropna().str.split("|").explode().value_counts().head(15)
    )
    plt.figure(figsize=(9, 6))
    sns.barplot(x=genres.values, y=genres.index, palette="mako")
    plt.title("Top 15 genres by frequency")
    plt.xlabel("Number of movies")
    savefig("07_top_genres.png")


# --------------------------------------------------------------------------- #
# 4. Preprocessing & feature engineering
# --------------------------------------------------------------------------- #
# Columns dropped because they are identifiers / leak the target / are free text.
LEAKAGE_OR_ID_COLS = [
    "imdb_score",       # target source - would leak the label
    "Classify",         # the label itself
    "movie_title",      # unique identifier
    "movie_imdb_link",  # unique identifier
    "plot_keywords",    # high-cardinality free text
    "actor_1_name",     # high-cardinality names -> use their FB likes instead
    "actor_2_name",
    "actor_3_name",
    "director_name",
]


def preprocess(df: pd.DataFrame):
    """Return feature matrix X and encoded target y.

    Handles missing values, engineers a couple of features, label-encodes
    categoricals and drops one of every highly-correlated numeric pair to
    address multicollinearity.
    """
    print("\n[4] Preprocessing & feature engineering ...")
    data = df.copy()

    # --- Feature engineering --------------------------------------------- #
    # profit = gross - budget captures commercial success independent of scale.
    if {"gross", "budget"}.issubset(data.columns):
        data["profit"] = data["gross"] - data["budget"]
    # Number of genres a movie is tagged with.
    data["genre_count"] = data["genres"].fillna("").apply(
        lambda g: len([x for x in g.split("|") if x])
    )
    # Age of the movie relative to the newest title in the dataset.
    if "title_year" in data.columns:
        newest = data["title_year"].max()
        data["movie_age"] = newest - data["title_year"]

    # Explicit ordered mapping (Flop=0, Average=1, Hit=2). We avoid
    # LabelEncoder here because it sorts classes alphabetically, which would
    # break the alignment between the encoded target and CLASS_ORDER used for
    # report/plot labels.
    label_map = {label: idx for idx, label in enumerate(CLASS_ORDER)}
    y_enc = data["Classify"].astype(str).map(label_map).to_numpy()

    # Drop identifier / leakage columns.
    X = data.drop(columns=[c for c in LEAKAGE_OR_ID_COLS if c in data.columns])
    X = X.drop(columns=["genres", "title_year"], errors="ignore")

    # --- Missing values --------------------------------------------------- #
    num_cols = X.select_dtypes(include=[np.number]).columns
    cat_cols = X.select_dtypes(include=["object"]).columns

    for col in num_cols:
        X[col] = X[col].fillna(X[col].median())
    for col in cat_cols:
        X[col] = X[col].fillna(X[col].mode().iloc[0] if not X[col].mode().empty else "Unknown")

    # --- Encode categoricals (label encoding per brief) ------------------- #
    for col in cat_cols:
        X[col] = LabelEncoder().fit_transform(X[col].astype(str))

    # --- Multicollinearity: drop one of each |corr| > 0.85 pair ----------- #
    corr = X.corr().abs()
    upper = corr.where(np.triu(np.ones(corr.shape), k=1).astype(bool))
    to_drop = [c for c in upper.columns if any(upper[c] > 0.85)]
    if to_drop:
        print(f"    dropping highly-correlated columns: {to_drop}")
        X = X.drop(columns=to_drop)

    print(f"    final feature set ({X.shape[1]}): {list(X.columns)}")
    return X, y_enc, list(CLASS_ORDER)


# --------------------------------------------------------------------------- #
# 5. Model training & comparison
# --------------------------------------------------------------------------- #
def train_and_evaluate(X, y, class_names):
    print("\n[5] Training and comparing classifiers ...")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )

    # Scale features (needed for KNN / LogReg; harmless for tree models).
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    models = {
        "Logistic Regression": LogisticRegression(max_iter=1000,
                                                   random_state=RANDOM_STATE),
        "K-Nearest Neighbours": KNeighborsClassifier(n_neighbors=15),
        "Decision Tree": DecisionTreeClassifier(random_state=RANDOM_STATE,
                                                max_depth=12),
        "Random Forest": RandomForestClassifier(
            n_estimators=300, random_state=RANDOM_STATE, n_jobs=-1,
            class_weight="balanced"
        ),
        "Gradient Boosting": GradientBoostingClassifier(random_state=RANDOM_STATE),
    }

    results = {}
    for name, model in models.items():
        model.fit(X_train_s, y_train)
        preds = model.predict(X_test_s)
        acc = accuracy_score(y_test, preds)
        f1 = f1_score(y_test, preds, average="weighted")
        results[name] = {"accuracy": acc, "f1_weighted": f1, "model": model,
                         "preds": preds}
        print(f"    {name:<22} accuracy={acc:.4f}  f1_weighted={f1:.4f}")

    # --- Comparison chart ------------------------------------------------- #
    comp = pd.DataFrame(
        {k: {"accuracy": v["accuracy"], "f1_weighted": v["f1_weighted"]}
         for k, v in results.items()}
    ).T
    plt.figure(figsize=(9, 5))
    comp.plot(kind="bar", ax=plt.gca(), colormap="viridis")
    plt.ylim(0, 1)
    plt.ylabel("Score")
    plt.title("Model comparison")
    plt.xticks(rotation=30, ha="right")
    plt.legend(loc="lower right")
    savefig("08_model_comparison.png")

    # --- Focus on the best model (emphasis on Random Forest) -------------- #
    best_name = max(results, key=lambda k: results[k]["f1_weighted"])
    print(f"\n    Best model by weighted-F1: {best_name}")
    best = results[best_name]
    best_preds = best["preds"]

    report = classification_report(
        y_test, best_preds, target_names=class_names, digits=4
    )
    print("\n    Classification report ({}):\n".format(best_name))
    print("\n".join("      " + line for line in report.splitlines()))

    # Confusion matrix heatmap
    cm = confusion_matrix(y_test, best_preds)
    plt.figure(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=class_names, yticklabels=class_names)
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    plt.title(f"Confusion matrix - {best_name}")
    savefig("09_confusion_matrix.png")

    # --- Feature importance (Random Forest) ------------------------------- #
    rf = results["Random Forest"]["model"]
    importances = pd.Series(rf.feature_importances_, index=X.columns)
    importances = importances.sort_values(ascending=False).head(15)
    plt.figure(figsize=(9, 6))
    sns.barplot(x=importances.values, y=importances.index, palette="rocket")
    plt.title("Top 15 feature importances (Random Forest)")
    plt.xlabel("Importance")
    savefig("10_feature_importance.png")

    # --- Persist a machine-readable results summary ----------------------- #
    summary = {
        "best_model": best_name,
        "n_features": int(X.shape[1]),
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "metrics": {k: {"accuracy": round(v["accuracy"], 4),
                        "f1_weighted": round(v["f1_weighted"], 4)}
                    for k, v in results.items()},
        "classification_report": classification_report(
            y_test, best_preds, target_names=class_names, output_dict=True
        ),
        "top_feature_importances": {k: round(float(v), 4)
                                    for k, v in importances.items()},
    }
    with open(OUT_DIR / "results_summary.json", "w") as fh:
        json.dump(summary, fh, indent=2)
    print(f"\n    saved results -> {(OUT_DIR / 'results_summary.json').relative_to(PROJECT_ROOT)}")

    with open(OUT_DIR / "classification_report.txt", "w") as fh:
        fh.write(f"Best model: {best_name}\n\n{report}\n")

    return summary


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main() -> None:
    print("=" * 70)
    print("Predicting Movie Success - ML pipeline")
    print("=" * 70)

    df = load_data()
    df = add_classify_column(df)
    run_eda(df)
    X, y, class_names = preprocess(df)
    train_and_evaluate(X, y, class_names)

    print("\nDone. Figures are in outputs/figures/, metrics in outputs/.")


if __name__ == "__main__":
    main()

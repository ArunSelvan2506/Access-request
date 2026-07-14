# Data Dictionary — `movie_metadata.csv`

The dataset contains **28 variables for 5,043 movies**, spanning ~100 years and
66 countries, with 2,399 unique directors and thousands of actors.
`imdb_score` is the response variable; the other 27 variables are possible
predictors.

| Variable Name | Description |
|---|---|
| `movie_title` | Title of the movie |
| `duration` | Duration in minutes |
| `director_name` | Name of the director of the movie |
| `director_facebook_likes` | Number of likes of the director on their Facebook page |
| `actor_1_name` | Primary actor starring in the movie |
| `actor_1_facebook_likes` | Number of Facebook likes for actor 1 |
| `actor_2_name` | Other actor starring in the movie |
| `actor_2_facebook_likes` | Number of Facebook likes for actor 2 |
| `actor_3_name` | Other actor starring in the movie |
| `actor_3_facebook_likes` | Number of Facebook likes for actor 3 |
| `num_user_for_reviews` | Number of users who gave a review |
| `num_critic_for_reviews` | Number of critical reviews on IMDB |
| `num_voted_users` | Number of people who voted for the movie |
| `cast_total_facebook_likes` | Total Facebook likes of the entire cast |
| `movie_facebook_likes` | Number of Facebook likes on the movie page |
| `plot_keywords` | Keywords describing the movie plot |
| `facenumber_in_poster` | Number of actors featured in the movie poster |
| `color` | Film colorization: 'Black and White' or 'Color' |
| `genres` | Film categorization (Animation, Comedy, Romance, Horror, Sci-Fi, Action, Family, …) |
| `title_year` | Year the movie was released (1916–2016) |
| `language` | English, Arabic, Chinese, French, German, Danish, Italian, Japanese, etc. |
| `country` | Country where the movie was produced |
| `content_rating` | Content rating of the movie |
| `aspect_ratio` | Aspect ratio the movie was made in |
| `movie_imdb_link` | IMDB link of the movie |
| `gross` | Gross earnings of the movie in dollars |
| `budget` | Budget of the movie in dollars |
| `imdb_score` | **IMDB score of the movie (response variable)** |

## Derived target — `Classify`

`Classify` is engineered from `imdb_score` per the project brief:

| IMDB score range | Category |
|---|---|
| 1 – 3 | Flop |
| 3 – 6 | Average |
| 6 – 10 | Hit |

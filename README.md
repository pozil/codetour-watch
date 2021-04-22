[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-CodeTour%20Watch-blue.svg?colorA=24292e&colorB=0366d6&style=flat&longCache=true&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAM6wAADOsB5dZE0gAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAERSURBVCiRhZG/SsMxFEZPfsVJ61jbxaF0cRQRcRJ9hlYn30IHN/+9iquDCOIsblIrOjqKgy5aKoJQj4O3EEtbPwhJbr6Te28CmdSKeqzeqr0YbfVIrTBKakvtOl5dtTkK+v4HfA9PEyBFCY9AGVgCBLaBp1jPAyfAJ/AAdIEG0dNAiyP7+K1qIfMdonZic6+WJoBJvQlvuwDqcXadUuqPA1NKAlexbRTAIMvMOCjTbMwl1LtI/6KWJ5Q6rT6Ht1MA58AX8Apcqqt5r2qhrgAXQC3CZ6i1+KMd9TRu3MvA3aH/fFPnBodb6oe6HM8+lYHrGdRXW8M9bMZtPXUji69lmf5Cmamq7quNLFZXD9Rq7v0Bpc1o/tp0fisAAAAASUVORK5CYII=)](https://github.com/marketplace/actions/codetour-watch)

# CodeTour Watch

A GitHub action that flags file changes in a PR that may affect [CodeTour content](https://marketplace.visualstudio.com/items?itemName=vsls-contrib.codetour).

The action comments on the PR to report changes that may impact CodeTour:

![Screenshot of comment](docs/comment-screenshot.png)

The action will not comment the PR if changes do not impact CodeTour.

## Usage

```yml
name: CodeTour watch

on:
    pull_request:
        types: [opened, edited, synchronize, reopened]

jobs:
    codetour-watch:
        runs-on: ubuntu-latest
        steps:
            - name: 'Watch CodeTour changes'
              uses: pozil/codetour-watch@v1.1.0
              with:
                  repo-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Name         | Required | Description                                                     | Default  |
| ------------ | -------- | --------------------------------------------------------------- | -------- |
| `repo-token` | true     | The GITHUB_TOKEN, required to comment.                          |          |
| `silent`     | false    | Optional flag that turns off the comment on the PR.             | `false`  |
| `tour-path`  | false    | Optional flag that specifies a custom `.tours` folder location. | `.tours` |
| `comment-id` | false    | ID of the comment to update (instead of creating a new one)     | `''`     |

### Updating the comment instead of creating a new one

This action can be used together with [peter-evans/find-comment](https://github.com/peter-evans/find-comment) to update the comment instead of creating a new one:

```yml
- name: Find codetour-watch comment
  uses: peter-evans/find-comment@v1
  id: find_comment
  with:
      issue-number: ${{ github.event.pull_request.number }}
      body-includes: 'CodeTour Watch'
- name: 'Watch CodeTour changes'
  uses: pozil/codetour-watch@v1.1.0
  with:
      repo-token: ${{ secrets.GITHUB_TOKEN }}
      comment-id: ${{ steps.find_comment.outputs.comment-id }}
```

## Outputs

| Name                 | Description                                                                          |
| -------------------- | ------------------------------------------------------------------------------------ |
| `impactedFiles`      | The list of files covered by tours that were changed.                                |
| `impactedTours`      | The list of tours that were impacted by the PR.                                      |
| `missingTourUpdates` | The list of tours that were impacted by the changes but that are not part of the PR. |

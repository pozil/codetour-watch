const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');

const DEFAULT_TOUR_PATH = '.tours/';
const TOUR_FILE_EXTENSION = '.tour';
const COMMENT_PREFIX_REGEX = /^\*\*(⚠️ )?CodeTour Watch\*\*/;

const run = async () => {
    try {
        // Get inputs
        const gitHubToken = core.getInput('repo-token', { required: true });
        const isSilentMode =
            core.getInput('silent') &&
            core.getInput('silent').toLowerCase() === 'true';
        const tourRootPath = core.getInput('tour-path')
            ? core.getInput('tour-path')
            : DEFAULT_TOUR_PATH;

        // Get octokit
        const octokit = github.getOctokit(gitHubToken);

        // Get repo and PR info
        const { repository, number, pull_request } = github.context.payload;
        if (!pull_request) {
            throw new Error(`Couldn't find PR info in current context`);
        }
        const [owner, repo] = repository.full_name.split('/');

        // Get previous CodeTour watch comment if any
        const commentId = await getCodeTourWatchComment(
            octokit,
            owner,
            repo,
            number
        );

        // Get PR changed files
        const prFiles = await getPrFiles(octokit, {
            owner,
            repo,
            pull_number: number
        });

        // Parse CodeTour definitions
        const tourDefinitions = [];
        await loadToursFromDirectory(tourRootPath, tourDefinitions);

        // Get files covered by CodeTour
        const touredFiles = getFilesCoveredByCodetour(tourDefinitions);

        // Get CodeTour files modified in PR
        const impactedFiles = prFiles
            .filter((file) => touredFiles.indexOf(file) !== -1)
            .sort();

        // Get CodeTour files that are impacted by update
        const impactedTours = getCodetourFromFiles(
            tourDefinitions,
            impactedFiles
        );

        // Find impacted CodeTour files that are not updated in PR
        const missingTourUpdates = [];
        impactedTours.forEach((impactedTour) => {
            if (prFiles.indexOf(impactedTour) === -1) {
                missingTourUpdates.push(impactedTour);
            }
        });

        // Comment PR if action is not silenced and a CodeTour is affected
        if (!isSilentMode && impactedTours.length > 0) {
            await commentPr(
                octokit,
                commentId
                    ? {
                          owner,
                          repo,
                          comment_id: commentId
                      }
                    : {
                          owner,
                          repo,
                          issue_number: number
                      },
                impactedFiles,
                impactedTours,
                missingTourUpdates
            );
        }

        // Set action ouput
        core.setOutput('impactedFiles', impactedFiles);
        core.setOutput('impactedTours', impactedTours);
        core.setOutput('missingTourUpdates', missingTourUpdates);
    } catch (error) {
        console.error(error);
        core.setFailed(error.message);
    }
};

/**
 * Gets the last CodeTour watch comment id
 * @param {object} octokit
 * @param {string} owner
 * @param {string} repo
 * @param {number} prNumber
 * @returns {number} comment id or null if none found
 */
const getCodeTourWatchComment = async (octokit, owner, repo, prNumber) => {
    try {
        const comments = await octokit.paginate(octokit.issues.listComments, {
            owner,
            repo,
            issue_number: prNumber
        });
        comments.reverse();
        const comment = comments.find((comment) =>
            COMMENT_PREFIX_REGEX.test(comment.body)
        );
        return comment ? comment.id : null;
    } catch (error) {
        throw new Error(`Failed to retrieved PR comments: ${error}`);
    }
};

/**
 * Creates/updates a comment with a CodeTour watch report
 * @param {object} octokit
 * @param {object} commentInfo
 * @param {string[]} impactedFiles
 * @param {string[]} impactedTours
 * @param {string[]} missingTourUpdates
 */
const commentPr = async (
    octokit,
    commentInfo,
    impactedFiles,
    impactedTours,
    missingTourUpdates
) => {
    let body = `**${
        missingTourUpdates.length > 0 ? '⚠️ ' : ''
    }CodeTour Watch**\n\n
Changed files with possible CodeTour impact:\n\n`;
    impactedFiles.forEach((file) => {
        body += `- \`${file}\`\n`;
    });
    body += '\nImpacted CodeTour files:\n\n';
    impactedTours.forEach((tour) => {
        if (missingTourUpdates.indexOf(tour) === -1) {
            body += `- \`${tour}\`\n`;
        } else {
            body += `- \`${tour}\` - ⚠️ **Missing from PR**\n`;
        }
    });
    body += `\nMake sure to review CodeTour files and update line numbers accordingly.`;
    commentInfo.body = body;

    if (commentInfo.comment_id === undefined) {
        await octokit.issues.createComment(commentInfo);
    } else {
        await octokit.issues.updateComment(commentInfo);
    }
};

/**
 * Gets the list of changed file names from a PR
 * @param {object} octokit
 * @param {object} prInfo
 * @returns {string[]} list of file names
 */
const getPrFiles = async (octokit, prInfo) => {
    try {
        const prDetails = await octokit.pulls.listFiles(prInfo);
        return prDetails.data.map((file) => file.filename);
    } catch (error) {
        throw new Error(`Failed to retrieved PR files: ${error}`);
    }
};

/**
 * Get the list of tours impacted by some files
 * @param {object[]} tourDefinitions
 * @param {string[]} files
 * @returns {string[]} list of tour file names
 */
const getCodetourFromFiles = (tourDefinitions, files) => {
    const defFiles = new Set();
    tourDefinitions.forEach((tourDefinition) => {
        tourDefinition.steps.forEach((step) => {
            if (files.indexOf(step.file) !== -1) {
                defFiles.add(tourDefinition.filename);
            }
        });
    });
    return Array.from(defFiles);
};

/**
 * Recursively reads tour definitions from a directory
 * @param {string} dirPath
 * @param {object[]} definitions
 */
function loadToursFromDirectory(dirPath, definitions) {
    // List files in folder
    let files;
    try {
        files = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch (error) {
        throw new Error(`Failed to read ${dirPath} directory: ${error}`);
    }
    // Parse CodeTour definitions and sub-folders
    files.forEach((file) => {
        const filePath = path.join(dirPath, file.name);
        if (file.isFile() && filePath.endsWith(TOUR_FILE_EXTENSION)) {
            const definition = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            definition.filename = filePath;
            definitions.push(definition);
        } else if (file.isDirectory()) {
            console.log('err');
            loadToursFromDirectory(filePath, definitions);
        }
    });
}

/**
 * Gets the list of unique file names covered by tour definitions
 * @param {object[]} tourDefinitions
 * @returns {string[]} list of covered file names
 */
const getFilesCoveredByCodetour = (tourDefinitions) => {
    const touredFiles = new Set();
    tourDefinitions.forEach((tourDefinition) => {
        tourDefinition.steps.forEach((step) => {
            touredFiles.add(step.file);
        });
    });
    return Array.from(touredFiles);
};

run();

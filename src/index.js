const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

const TOUR_DIR = '.tours/';

const run = async () => {
    try {
        // Get inputs
        const gitHubToken = core.getInput('repo-token', { required: true });
        const isSilentMode =
            core.getInput('silent') &&
            core.getInput('silent').toLowerCase() === 'true';

        // Get octokit
        const octokit = github.getOctokit(gitHubToken);

        // Get repo and PR info
        const { repository, number, pull_request } = github.context.payload;
        if (!pull_request) {
            throw new Error(`Couldn't find PR info in current context`);
        }
        const [owner, repo] = repository.full_name.split('/');

        // Get PR changed files
        const prFiles = await getPrFiles(octokit, {
            owner,
            repo,
            pull_number: number
        });

        // Parse CodeTour definitions
        const tourDefinitions = await loadCodetours();

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
                {
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

const commentPr = async (
    octokit,
    commentInfo,
    impactedFiles,
    impactedTours,
    missingTourUpdates
) => {
    let body = `**${(missingTourUpdates.length > 0) ? '⚠️ ' : ''}CodeTour Watch**\n\n
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

    await octokit.issues.createComment(commentInfo);
};

const getPrFiles = async (octokit, prInfo) => {
    try {
        const prDetails = await octokit.pulls.listFiles(prInfo);
        return prDetails.data.map((file) => file.filename);
    } catch (error) {
        throw new Error(`Failed to retrieved PR files: ${error}`);
    }
};

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

const loadCodetours = async () => {
    // List CodeTour definition files
    let defFiles;
    try {
        defFiles = await fs.promises.readdir(TOUR_DIR);
    } catch (error) {
        throw new Error(`Failed to read ${TOUR_DIR} directory: ${error}`);
    }
    // Parse CodeTour definitions
    return defFiles.map((defFile) => {
        const path = `${TOUR_DIR}${defFile}`;
        const definition = JSON.parse(fs.readFileSync(path, 'utf-8'));
        definition.filename = path;
        return definition;
    });
};

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

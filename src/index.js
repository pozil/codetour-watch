const core = require('@actions/core');
const github = require('@actions/github');

const run = async () => {
    // Get octokit
    const gitHubToken = core.getInput('repo-token', { required: true });
    //const octokit = new github.GitHub(gitHubToken);

    // Get repo and issue info
    console.log(github.context.payload);

    console.log(JSON.stringify(github.context.payload));

    /*
    const { repository, pull_number } = github.context.payload;
    if (!pull_number) {
        throw new Error(`Couldn't find issue info in current context`);
    }
    const [owner, repo] = repository.full_name.split('/');

    //const compare = await octokit.Repository.Commit.Compare(owner, repo, 'master', 'branch');

    const prFiles = octokit.pulls.listFiles({
        owner,
        repo,
        pull_number,
    });

    // Get issue assignees
    const assigneesString = core.getInput('assignees', { required: true });
    const assignees = assigneesString
        .split(',')
        .map((assigneeName) => assigneeName.trim());

    // Assign issue
    console.log(
        `Assigning issue ${issue.number} to users ${JSON.stringify(assignees)}`
    );
    try {
        await octokit.issues.addAssignees({
            owner,
            repo,
            issue_number: issue.number,
            assignees
        });
    } catch (error) {
        core.setFailed(error.message);
    }
*/
};

try {
    run();
} catch (error) {
    core.setFailed(error.message);
}

function convertQuery(query) {
    const fromMatch = query.match(/FROM\s+(['"].*?['"])/);
    const whereMatch = query.match(/WHERE\s+(.*)/);

    const fromClause = fromMatch ? fromMatch[1] : "";
    const whereClause = whereMatch ? whereMatch[1] : "";

    const newSelect = "SELECT '_alert_hdl.._active'";
    const newWhere = whereClause
        ? `WHERE (${whereClause} && ('_alert_hdl.._active' == 1))`
        : `WHERE ('_alert_hdl.._active' == 1)`;

    return `${newSelect} FROM ${fromClause} ${newWhere}`;
}

module.exports = { convertQuery };
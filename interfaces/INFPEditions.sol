// SPDX-License-Identifier: MIT
// Author: The Non-Fungible People Project
// Developed by TheBigMort

pragma solidity ^0.8.0;

interface INFPEditions {
    event EditionStartIndexBlockSet(uint256 edId, uint256 blockNum);
    event EditionStartIndexSet(uint256 edId, uint256 startIndex);
    event Claimed(
        address sender,
        uint256 claimNonce,
        uint256 tokenIndex,
        uint256 edId
    );

    event EditionSet(
        uint256 edId,
        uint256 MAX_SUPPLY,
        uint256 REVEAL_TIMESTAMP,
        uint256 price,
        bool status,
        string provHash,
        string _edURI
    );

    function setEditionStartIndex(uint256 edId) external;

    function claimNonce(address _address) external view returns (uint256);

    function getToken(uint256 id)
        external
        view
        returns (uint256 edId, uint256 tokenIdOfedition);

    function getEdition(uint256 edId)
        external
        view
        returns (
            uint256 editionIndex,
            uint256 MAX_SUPPLY,
            uint256 REVEAL_TIMESTAMP,
            uint256 PUBLIC_TIMESTAMP,
            uint256 price,
            uint256 startIndex,
            uint256 startIndexBlock,
            bool status,
            uint256 supply,
            string memory provHash,
            string memory _edURI
        );

    function getAllTokens()
        external
        view
        returns (uint256[] memory edIds, uint256[] memory tokenIdsOfeditions);

    function tokenIdsOfEdition(uint256 edId)
        external
        view
        returns (uint256[] memory tokenIds);

    function totalSupply() external view returns (uint256);
}
